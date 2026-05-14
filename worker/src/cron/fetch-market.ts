import type { Env } from "../env";
import { fetchMarketDaily, type MarketDailyRow } from "../data-sources/market";

/**
 * 每日抓近 7 天大盤數據（加權指數 + 全市場成交量 + 全市場融資融券餘額）
 * 多抓幾天以涵蓋休市/補單。
 */
export async function runFetchMarket(env: Env): Promise<void> {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const startDate = start.toISOString().slice(0, 10);

  console.log(`[fetch-market] from ${startDate}`);

  let rows: MarketDailyRow[];
  try {
    rows = await fetchMarketDaily(startDate);
  } catch (e) {
    console.error("[fetch-market] failed:", e);
    return;
  }

  if (rows.length === 0) {
    console.log("[fetch-market] no data");
    return;
  }

  const stmts = rows.map((r) =>
    env.DB.prepare(
      `INSERT OR REPLACE INTO market_daily
         (trade_date, taiex_close, taiex_change, taiex_change_pct,
          total_volume_value, total_margin_balance, total_short_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      r.trade_date,
      r.taiex_close,
      r.taiex_change,
      r.taiex_change_pct,
      r.total_volume_value,
      r.total_margin_balance,
      r.total_short_balance
    )
  );

  await env.DB.batch(stmts);
  console.log(`[fetch-market] upserted ${rows.length} rows`);
}
