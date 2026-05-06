import type { Env } from "../env";
import { ACTIVE_ETFS, CRON_JOBS } from "@jstock/shared";
import { scrapeHoldings, type ScrapedHolding } from "../scrapers/moneydj";
import { logCronRun } from "./log";
import { getTwMarketDate } from "../utils/date";

export async function runScrapeHoldings(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();
  let totalRecords = 0;
  let etfCount = 0;
  const errors: string[] = [];

  for (const etf of ACTIVE_ETFS) {
    try {
      const holdings = await scrapeHoldings(etf.code);
      if (holdings.length === 0) {
        errors.push(`${etf.code}: 0 holdings`);
        continue;
      }

      await batchInsertHoldings(db, today, etf.code, holdings);
      totalRecords += holdings.length;
      etfCount++;
      console.log(`[scrape] ${etf.code}: ${holdings.length} holdings`);
    } catch (err) {
      const msg = `${etf.code}: ${(err as Error).message}`;
      errors.push(msg);
      console.error(`[scrape] ${msg}`);
    }
  }

  await logCronRun(db, {
    jobName: CRON_JOBS.SCRAPE_HOLDINGS,
    runDate: today,
    status: errors.length === 0 ? "success" : etfCount > 0 ? "partial" : "failed",
    etfCount,
    recordCount: totalRecords,
    errorMessage: errors.length > 0 ? errors.join("; ") : null,
    startedAt,
  });

  console.log(`[scrape] done: ${etfCount} ETFs, ${totalRecords} records, ${errors.length} errors`);
}

async function batchInsertHoldings(
  db: D1Database,
  date: string,
  etfCode: string,
  holdings: ScrapedHolding[]
): Promise<void> {
  const BATCH_SIZE = 50;
  for (let i = 0; i < holdings.length; i += BATCH_SIZE) {
    const batch = holdings.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((h) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO holdings_snapshots
           (snapshot_date, etf_code, stock_code, stock_name, weight_pct, shares)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(date, etfCode, h.stock_code, h.stock_name, h.weight_pct, h.shares)
    );
    await db.batch(stmts);
  }
}
