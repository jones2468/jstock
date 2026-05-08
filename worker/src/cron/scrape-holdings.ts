import type { Env } from "../env";
import { CRON_JOBS } from "@jstock/shared";
import { scrapeHoldings, type ScrapedHolding } from "../scrapers/moneydj";
import { logCronRun } from "./log";
import { getTwMarketDate } from "../utils/date";

const CONCURRENCY = 5;
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runScrapeHoldings(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();
  let totalRecords = 0;
  let etfCount = 0;
  const errors: string[] = [];

  const { results: etfs } = await db
    .prepare(`SELECT etf_code FROM etfs ORDER BY etf_code`)
    .all<{ etf_code: string }>();

  if (!etfs || etfs.length === 0) {
    console.log("[scrape] no ETFs in database");
    return;
  }

  for (let i = 0; i < etfs.length; i += CONCURRENCY) {
    const chunk = etfs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (etf) => {
        const holdings = await scrapeHoldings(etf.etf_code);
        return { code: etf.etf_code, holdings };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { code, holdings } = result.value;
        if (holdings.length === 0) {
          continue;
        }
        await batchInsertHoldings(db, today, code, holdings);
        totalRecords += holdings.length;
        etfCount++;
      } else {
        const msg = result.reason?.message ?? String(result.reason);
        errors.push(msg.slice(0, 100));
        console.error(`[scrape] ${msg}`);
      }
    }

    if (i + CONCURRENCY < etfs.length) {
      await sleep(DELAY_MS);
    }
  }

  await logCronRun(db, {
    jobName: CRON_JOBS.SCRAPE_HOLDINGS,
    runDate: today,
    status: errors.length === 0 ? "success" : etfCount > 0 ? "partial" : "failed",
    etfCount,
    recordCount: totalRecords,
    errorMessage:
      errors.length > 0 ? errors.slice(0, 20).join("; ").slice(0, 500) : null,
    startedAt,
  });

  console.log(
    `[scrape] done: ${etfCount}/${etfs.length} ETFs, ${totalRecords} records, ${errors.length} errors`
  );
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
