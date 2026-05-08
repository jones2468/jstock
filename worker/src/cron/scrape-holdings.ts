import type { Env } from "../env";
import { CRON_JOBS } from "@jstock/shared";
import { scrapeHoldings, type ScrapedHolding } from "../scrapers/moneydj";
import { logCronRun } from "./log";
import { getTwMarketDate } from "../utils/date";

const CONCURRENCY = 3;
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runScrapeHoldings(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();

  const { results: allEtfs } = await db
    .prepare(
      `SELECT etf_code FROM etfs WHERE etf_type NOT IN ('bond', 'money_market', 'futures') ORDER BY etf_code`
    )
    .all<{ etf_code: string }>();

  if (!allEtfs || allEtfs.length === 0) {
    console.log("[scrape] no ETFs in database");
    return;
  }

  let etfCount = 0;
  let totalRecords = 0;
  const errors: string[] = [];

  for (let i = 0; i < allEtfs.length; i += CONCURRENCY) {
    const chunk = allEtfs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (etf) => {
        const holdings = await scrapeHoldings(etf.etf_code);
        return { code: etf.etf_code, holdings };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { code, holdings } = result.value;
        if (holdings.length === 0) continue;
        await batchInsertHoldings(db, today, code, holdings);
        totalRecords += holdings.length;
        etfCount++;
      } else {
        const msg = result.reason?.message ?? String(result.reason);
        errors.push(msg.slice(0, 80));
      }
    }

    if (i + CONCURRENCY < allEtfs.length) {
      await sleep(DELAY_MS);
    }
  }

  await logCronRun(db, {
    jobName: CRON_JOBS.SCRAPE_HOLDINGS,
    runDate: today,
    status:
      errors.length === 0
        ? "success"
        : etfCount > 0
          ? "partial"
          : "failed",
    etfCount,
    recordCount: totalRecords,
    errorMessage:
      errors.length > 0 ? errors.slice(0, 20).join("; ").slice(0, 500) : null,
    startedAt,
  });

  console.log(
    `[scrape] done: ${etfCount}/${allEtfs.length} ETFs, ${totalRecords} records, ${errors.length} errors`
  );
}

export async function runScrapeHoldingsBatch(
  env: Env,
  offset: number
): Promise<{ scraped: number; total: number; done: boolean }> {
  const db = env.DB;
  const today = getTwMarketDate();

  const { results: allEtfs } = await db
    .prepare(
      `SELECT etf_code FROM etfs WHERE etf_type NOT IN ('bond', 'money_market', 'futures') ORDER BY etf_code`
    )
    .all<{ etf_code: string }>();

  if (!allEtfs || allEtfs.length === 0) {
    return { scraped: 0, total: 0, done: true };
  }

  const batch = allEtfs.slice(offset, offset + 20);
  if (batch.length === 0) {
    return { scraped: 0, total: allEtfs.length, done: true };
  }

  let etfCount = 0;
  let totalRecords = 0;

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (etf) => {
        const holdings = await scrapeHoldings(etf.etf_code);
        return { code: etf.etf_code, holdings };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { code, holdings } = result.value;
        if (holdings.length === 0) continue;
        await batchInsertHoldings(db, today, code, holdings);
        totalRecords += holdings.length;
        etfCount++;
      }
    }

    if (i + CONCURRENCY < batch.length) {
      await sleep(DELAY_MS);
    }
  }

  const done = offset + 20 >= allEtfs.length;

  if (done) {
    await logCronRun(db, {
      jobName: CRON_JOBS.SCRAPE_HOLDINGS,
      runDate: today,
      status: "success",
      etfCount,
      recordCount: totalRecords,
      errorMessage: null,
      startedAt: new Date().toISOString(),
    });
  }

  return { scraped: etfCount, total: allEtfs.length, done };
}

async function batchInsertHoldings(
  db: D1Database,
  date: string,
  etfCode: string,
  holdings: ScrapedHolding[]
): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < holdings.length; i += BATCH) {
    const batch = holdings.slice(i, i + BATCH);
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
