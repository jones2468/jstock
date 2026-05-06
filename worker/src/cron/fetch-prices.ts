import type { Env } from "../env";
import { CRON_JOBS } from "@jstock/shared";
import { fetchTWSEDayAll, type StockPriceRow } from "../data-sources/twse";
import { logCronRun } from "./log";
import { getTwMarketDate } from "../utils/date";

export async function runFetchPrices(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();

  try {
    // 1. Get stock codes we care about (held by any ETF today)
    const { results: held } = await db
      .prepare(
        `SELECT DISTINCT stock_code FROM holdings_snapshots WHERE snapshot_date = ?`
      )
      .bind(today)
      .all<{ stock_code: string }>();

    const heldCodes = new Set(held.map((r) => r.stock_code));
    console.log(`[prices] ${heldCodes.size} unique stocks held today`);

    if (heldCodes.size === 0) {
      console.log("[prices] no holdings for today, skipping");
      await logCronRun(db, {
        jobName: CRON_JOBS.FETCH_PRICES,
        runDate: today,
        status: "success",
        etfCount: 0,
        recordCount: 0,
        errorMessage: "no holdings snapshot for today",
        startedAt,
      });
      return;
    }

    // 2. Fetch all stock prices from TWSE
    const allPrices = await fetchTWSEDayAll();
    console.log(`[prices] TWSE returned ${allPrices.length} records`);

    // 3. Filter to only ETF-held stocks
    const filtered = allPrices.filter((p) => heldCodes.has(p.stock_code));
    console.log(`[prices] ${filtered.length} records match held stocks`);

    // 4. Batch insert
    await batchInsertPrices(db, filtered);

    await logCronRun(db, {
      jobName: CRON_JOBS.FETCH_PRICES,
      runDate: today,
      status: "success",
      etfCount: 0,
      recordCount: filtered.length,
      errorMessage: null,
      startedAt,
    });

    console.log(`[prices] done: ${filtered.length} records inserted`);
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`[prices] error: ${errMsg}`);
    await logCronRun(db, {
      jobName: CRON_JOBS.FETCH_PRICES,
      runDate: today,
      status: "failed",
      etfCount: 0,
      recordCount: 0,
      errorMessage: errMsg,
      startedAt,
    });
  }
}

async function batchInsertPrices(db: D1Database, rows: StockPriceRow[]): Promise<void> {
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO stock_prices
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
