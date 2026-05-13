/**
 * 一次性腳本：用 FinMind 補抓歷史季 EPS 並寫入遠端 D1
 * 用法：NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-eps.ts
 *
 * 策略：先查 D1 拿到所有 ETF 持有的股票代號，逐支用 FinMind 抓 EPS，
 *       產生 SQL 後用 wrangler d1 execute 寫入。
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FINMIND_API = "https://api.finmindtrade.com/api/v4/data";
const WORKER_DIR = join(__dirname, "..");

interface FinMindRow {
  date: string;
  stock_id: string;
  type: string;
  value: number;
}

interface EPSRow {
  stock_code: string;
  report_year: number;
  report_quarter: number;
  eps: number | null;
  revenue: number | null;
  operating_income: number | null;
  pre_tax_income: number | null;
  net_income: number | null;
}

// 要抓的股票清單（ETF 常見持股 + 大型權值股）
const STOCK_CODES = [
  // 大型權值股
  "2330", "2454", "2317", "2382", "3711", "2308", "2303", "2412",
  "2881", "2882", "2891", "2886", "2884", "2885", "2892",
  // 電子
  "2357", "3034", "2379", "3037", "2345", "3661", "2395", "6669",
  "3443", "6415", "8046", "3105", "2449", "5347",
  // 台達電 / 電力
  "2301", "6488", "1519", "1513", "8150",
  // 金融
  "2880", "2883", "2887", "2890",
  // 傳產 / 其他
  "1301", "1303", "1326", "2002", "2207", "2912", "5880",
  "9910", "2105", "1216", "2633", "2603",
  // ABF / ASIC
  "3037", "3661", "6770", "5274", "2449",
  // 更多常見 ETF 持股
  "2327", "3231", "2474", "4904", "2603", "3008",
  "2615", "2377", "4938", "3045", "2347", "6505",
];

// 去重
const CODES = [...new Set(STOCK_CODES)];

function escSql(s: string | number | null): string {
  if (s === null || s === undefined) return "NULL";
  if (typeof s === "number") return isNaN(s) ? "NULL" : String(s);
  return `'${String(s).replace(/'/g, "''")}'`;
}

function dateToQuarter(dateStr: string): { year: number; quarter: number } | null {
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return null;
  const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return { year: y, quarter: q };
}

async function fetchEPS(code: string): Promise<EPSRow[]> {
  const url = `${FINMIND_API}?dataset=TaiwanStockFinancialStatements&data_id=${code}&start_date=2023-01-01`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as { status: number; data: FinMindRow[] };
  if (!json.data?.length) return [];

  const byDate = new Map<string, Map<string, number>>();
  for (const row of json.data) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Map());
    byDate.get(row.date)!.set(row.type, row.value);
  }

  const results: EPSRow[] = [];
  for (const [dateStr, types] of byDate) {
    const yq = dateToQuarter(dateStr);
    if (!yq) continue;
    const eps = types.get("EPS") ?? null;
    if (eps === null) continue;

    results.push({
      stock_code: code,
      report_year: yq.year,
      report_quarter: yq.quarter,
      eps,
      revenue: types.get("Revenue") ?? null,
      operating_income: types.get("OperatingIncome") ?? null,
      pre_tax_income: types.get("PreTaxIncome") ?? null,
      net_income: types.get("IncomeAfterTaxes") ?? null,
    });
  }

  return results;
}

function writeToD1(rows: EPSRow[], label: string): boolean {
  const stmts = rows.map(
    (r) =>
      `INSERT OR REPLACE INTO quarterly_eps (stock_code, report_year, report_quarter, eps, revenue, operating_income, pre_tax_income, net_income) VALUES (${escSql(r.stock_code)}, ${r.report_year}, ${r.report_quarter}, ${escSql(r.eps)}, ${escSql(r.revenue)}, ${escSql(r.operating_income)}, ${escSql(r.pre_tax_income)}, ${escSql(r.net_income)});`
  );

  const tmpFile = join(WORKER_DIR, `_tmp_eps_${label}.sql`);
  writeFileSync(tmpFile, stmts.join("\n"), "utf-8");

  try {
    execSync(
      `npx wrangler d1 execute jstock-db --remote --file="${tmpFile}"`,
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000 }
    );
    return true;
  } catch (e: any) {
    const stderr = e.stderr?.toString() ?? "";
    console.error(`  D1 write failed: ${stderr.slice(0, 200)}`);
    return false;
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  console.log(`Backfilling EPS for ${CODES.length} stocks...\n`);

  let totalRows = 0;
  let successes = 0;
  let failures = 0;

  for (let i = 0; i < CODES.length; i++) {
    const code = CODES[i];
    process.stdout.write(`[${i + 1}/${CODES.length}] ${code}... `);

    try {
      const rows = await fetchEPS(code);
      if (rows.length === 0) {
        console.log("no data");
        continue;
      }

      const ok = writeToD1(rows, code);
      if (ok) {
        console.log(`✅ ${rows.length} quarters`);
        totalRows += rows.length;
        successes++;
      } else {
        console.log(`❌ D1 write failed`);
        failures++;
      }
    } catch (e: any) {
      console.log(`❌ ${e.message}`);
      failures++;
    }

    // Rate limit: 400ms between requests
    if (i < CODES.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${totalRows} rows, ${successes} ok, ${failures} failed`);
}

main();
