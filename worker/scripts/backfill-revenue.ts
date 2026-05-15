/**
 * 月營收 backfill：直接從 MOPS 抓 HTML、解析、產 SQL，
 * 透過 wrangler d1 execute --remote 寫入 production D1。
 *
 * 不需要 ADMIN_TOKEN（繞過部署的 admin endpoint）。
 *
 * 用法：
 *   cd worker
 *   npx tsx scripts/backfill-revenue.ts --months 24
 *   npx tsx scripts/backfill-revenue.ts --year 2024 --month 5      # 指定單月
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchMonthlyRevenue, type RevenueRow } from "../src/data-sources/mops";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_DIR = join(__dirname, "..");

function parseArgs(): { months: number; single?: { y: number; m: number } } {
  const args = process.argv.slice(2);
  let months = 12;
  let y: number | undefined;
  let m: number | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--months") months = parseInt(args[++i], 10);
    else if (args[i] === "--year") y = parseInt(args[++i], 10);
    else if (args[i] === "--month") m = parseInt(args[++i], 10);
  }
  if (y && m) return { months: 0, single: { y, m } };
  return { months };
}

// 往前 N 個月：從上個月（穩定可抓）開始
function previousMonths(n: number, anchor: Date = new Date()): Array<{ y: number; m: number }> {
  const out: Array<{ y: number; m: number }> = [];
  let y = anchor.getFullYear();
  let m = anchor.getMonth(); // 0-based → 上個月的 1-based
  if (anchor.getDate() < 11) m -= 1;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  for (let i = 0; i < n; i++) {
    out.push({ y, m });
    m -= 1;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
  }
  return out;
}

function sqlEscape(v: number | null): string {
  if (v == null || isNaN(v)) return "NULL";
  return String(v);
}

function rowToSql(r: RevenueRow): string {
  return (
    `INSERT OR REPLACE INTO monthly_revenue ` +
    `(report_year, report_month, stock_code, revenue, yoy_pct, mom_pct, ytd_revenue, ytd_yoy_pct) ` +
    `VALUES (${r.report_year}, ${r.report_month}, '${r.stock_code}', ` +
    `${sqlEscape(r.revenue)}, ${sqlEscape(r.yoy_pct)}, ${sqlEscape(r.mom_pct)}, ` +
    `${sqlEscape(r.ytd_revenue)}, ${sqlEscape(r.ytd_yoy_pct)});`
  );
}

function executeSqlFile(sql: string, tag: string): { ok: boolean; err?: string } {
  const tmpFile = join(WORKER_DIR, `_tmp_revenue_${tag}.sql`);
  writeFileSync(tmpFile, sql, "utf-8");
  try {
    execSync(
      `npx wrangler d1 execute jstock-db --remote --file="${tmpFile}"`,
      { cwd: WORKER_DIR, stdio: ["ignore", "ignore", "inherit"], timeout: 120000 }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, err: (e as Error).message.slice(0, 200) };
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {}
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function backfillMonth(y: number, m: number): Promise<{ rows: number; err?: string }> {
  let rows: RevenueRow[];
  try {
    rows = await fetchMonthlyRevenue(y, m);
  } catch (e) {
    return { rows: 0, err: `fetch: ${(e as Error).message}` };
  }
  if (rows.length === 0) return { rows: 0, err: "no rows from MOPS" };

  // 切批：D1 single file 上限保守取 500 rows 一檔
  const BATCH = 500;
  let totalWritten = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const sql = slice.map(rowToSql).join("\n");
    const r = executeSqlFile(sql, `${y}_${m}_${i}`);
    if (!r.ok) return { rows: totalWritten, err: `d1 exec: ${r.err}` };
    totalWritten += slice.length;
  }
  return { rows: totalWritten };
}

async function main() {
  const args = parseArgs();
  const targets = args.single
    ? [{ y: args.single.y, m: args.single.m }]
    : previousMonths(args.months);

  console.log(`Backfilling ${targets.length} month(s) directly to D1:`);
  console.log(targets.map((t) => `${t.y}-${String(t.m).padStart(2, "0")}`).join(", "));
  console.log("");

  let ok = 0;
  let fail = 0;
  let totalRows = 0;
  for (const { y, m } of targets) {
    process.stdout.write(`  ${y}-${String(m).padStart(2, "0")} ... `);
    const r = await backfillMonth(y, m);
    if (r.err) {
      fail++;
      console.log(`FAIL: ${r.err}`);
    } else {
      ok++;
      totalRows += r.rows;
      console.log(`OK (${r.rows} rows)`);
    }
    // 對 MOPS 友善：每月間隔 2 秒
    await sleep(2000);
  }

  console.log("");
  console.log(`Done: ${ok} ok / ${fail} fail / ${totalRows} total rows`);
}

main();
