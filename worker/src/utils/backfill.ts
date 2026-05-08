import { fetchStockHistory, type StockPriceRow } from "../data-sources/twse";

// 確保 [start, today] 區間在 stock_prices 有資料；缺多少補多少（最多 60 個月）
export async function ensureHistoricalData(
  db: D1Database,
  code: string,
  start: string
): Promise<void> {
  const earliest = await db
    .prepare(`SELECT MIN(price_date) as d FROM stock_prices WHERE stock_code = ?`)
    .bind(code)
    .first<{ d: string | null }>();

  if (earliest?.d && earliest.d <= start) return;

  try {
    const now = new Date();
    const startDate = new Date(start);

    if (earliest?.d) {
      const gapEnd = new Date(earliest.d);
      const gapMonths =
        (gapEnd.getFullYear() - startDate.getFullYear()) * 12 +
        (gapEnd.getMonth() - startDate.getMonth()) +
        1;
      if (gapMonths > 0) {
        const history = await fetchStockHistory(code, gapMonths, gapEnd);
        if (history.length > 0) await batchUpsertPrices(db, history);
      }
    } else {
      const totalMonths =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) +
        1;
      const history = await fetchStockHistory(code, Math.min(totalMonths, 60));
      if (history.length > 0) await batchUpsertPrices(db, history);
    }
  } catch (e) {
    console.error(`[backfill] ${code} failed: ${(e as Error).message}`);
  }
}

export async function batchUpsertPrices(
  db: D1Database,
  rows: StockPriceRow[]
): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO stock_prices
           (price_date, stock_code, stock_name, open_price, high_price, low_price, close_price, volume, change_val)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.price_date,
          r.stock_code,
          r.stock_name,
          r.open_price,
          r.high_price,
          r.low_price,
          r.close_price,
          r.volume,
          r.change_val
        )
    );
    await db.batch(stmts);
  }
}
