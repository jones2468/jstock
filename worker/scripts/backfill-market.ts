/**
 * 一次性腳本：補抓 ~6 個月的大盤每日資料（加權指數 + 全市場成交量 + 全市場融資融券）
 * 用法：NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-market.ts
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_DIR = join(__dirname, "..");

const FINMIND = "https://api.finmindtrade.com/api/v4/data";

interface TaiexRow {
  date: string;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
}
interface MarginLongRow {
  date: string;
  name: string;
  TodayBalance: number;
}

function escSql(v: string | number | null): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main() {
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const startDate = start.toISOString().slice(0, 10);

  console.log(`Backfilling market_daily from ${startDate}...`);

  const [taiexJson, marginJson] = await Promise.all([
    fetchJson<{ data: TaiexRow[] }>(
      `${FINMIND}?dataset=TaiwanStockPrice&data_id=TAIEX&start_date=${startDate}`
    ),
    fetchJson<{ data: MarginLongRow[] }>(
      `${FINMIND}?dataset=TaiwanStockTotalMarginPurchaseShortSale&start_date=${startDate}`
    ),
  ]);

  const taiex = taiexJson.data ?? [];
  const margin = marginJson.data ?? [];

  // 把長格式聚合：date -> { margin_money, short_volume }
  const marginByDate = new Map<string, { money: number | null; short: number | null }>();
  for (const r of margin) {
    if (!marginByDate.has(r.date)) marginByDate.set(r.date, { money: null, short: null });
    const slot = marginByDate.get(r.date)!;
    if (r.name === "MarginPurchaseMoney") slot.money = r.TodayBalance;
    else if (r.name === "ShortSale") slot.short = r.TodayBalance;
  }

  console.log(`TAIEX rows: ${taiex.length}, margin dates: ${marginByDate.size}`);

  const stmts: string[] = taiex.map((t) => {
    const m = marginByDate.get(t.date);
    const change_pct =
      t.close && t.spread != null
        ? Math.round((t.spread / (t.close - t.spread)) * 10000) / 100
        : null;
    const volume_value =
      t.Trading_money != null
        ? Math.round((t.Trading_money / 1e8) * 100) / 100
        : null;
    const margin_balance =
      m?.money != null ? Math.round((m.money / 1e8) * 100) / 100 : null;
    return `INSERT OR REPLACE INTO market_daily
      (trade_date, taiex_close, taiex_change, taiex_change_pct,
       total_volume_value, total_margin_balance, total_short_balance)
     VALUES (${escSql(t.date)}, ${escSql(t.close ?? null)}, ${escSql(t.spread ?? null)}, ${escSql(change_pct)},
             ${escSql(volume_value)}, ${escSql(margin_balance)}, ${escSql(m?.short ?? null)});`;
  });

  if (stmts.length === 0) {
    console.log("nothing to write");
    return;
  }

  const tmpFile = join(WORKER_DIR, "_tmp_market_backfill.sql");
  writeFileSync(tmpFile, stmts.join("\n"), "utf-8");

  try {
    execSync(
      `npx wrangler d1 execute jstock-db --remote --file="${tmpFile}"`,
      { cwd: WORKER_DIR, stdio: "inherit", timeout: 60000 }
    );
    console.log(`\n=== Done === ${stmts.length} rows`);
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
