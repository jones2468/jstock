// 季 EPS 抓取 cron job
// 資料源：FinMind API — 逐支股票抓取（free tier 200 req/min）
// 抓取範圍：所有被 ETF 持有的股票
import type { Env } from "../env";
import {
  fetchStockEPS,
  type QuarterlyEPSRow,
} from "../data-sources/mops-eps";
import { logCronRun } from "./log";

export async function runFetchEPS(env: Env): Promise<void> {
  const db = env.DB;
  const startedAt = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 取得所有 ETF 持有的不重複股票代號
    const { results: stocks } = await db
      .prepare(
        `SELECT DISTINCT stock_code FROM holdings_snapshots
         WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM holdings_snapshots)
         ORDER BY stock_code`
      )
      .all<{ stock_code: string }>();

    const codes = stocks.map((s) => s.stock_code);
    console.log(`[eps] ${codes.length} stocks to fetch`);

    if (codes.length === 0) {
      await logCronRun(db, {
        jobName: "fetch_eps",
        runDate: today,
        status: "partial",
        etfCount: 0,
        recordCount: 0,
        errorMessage: "no stocks found in holdings",
        startedAt,
      });
      return;
    }

    // 逐支抓取（帶 rate limit）
    let totalRows = 0;
    let errors = 0;
    const BATCH = 50;

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      try {
        const rows = await fetchStockEPS(code, "2023-01-01");
        if (rows.length > 0) {
          await batchUpsertEPS(db, rows);
          totalRows += rows.length;
        }
      } catch (e) {
        console.error(`[eps] ${code}: ${(e as Error).message}`);
        errors++;
      }

      // Rate limit: 300ms between requests
      if (i < codes.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }

      if (i % BATCH === 0 && i > 0) {
        console.log(`[eps] progress: ${i}/${codes.length} (${totalRows} rows, ${errors} errors)`);
      }
    }

    console.log(`[eps] done: ${totalRows} rows, ${errors} errors`);

    await logCronRun(db, {
      jobName: "fetch_eps",
      runDate: today,
      status: errors === 0 ? "success" : "partial",
      etfCount: codes.length,
      recordCount: totalRows,
      errorMessage: errors > 0 ? `${errors} stocks failed` : null,
      startedAt,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[eps] fatal: ${msg}`);
    await logCronRun(db, {
      jobName: "fetch_eps",
      runDate: today,
      status: "failed",
      etfCount: 0,
      recordCount: 0,
      errorMessage: msg,
      startedAt,
    });
  }
}

/**
 * 抓指定股票的 EPS（admin 手動用）
 */
export async function runFetchEPSForQuarter(
  env: Env,
  year: number,
  quarter: number
): Promise<{ rows: number }> {
  // year/quarter 在 FinMind 模式下用不到（FinMind 一次回傳所有季度）
  // 但保留 API 介面相容性，改為抓所有 ETF 持股的 EPS
  const db = env.DB;
  const { results: stocks } = await db
    .prepare(
      `SELECT DISTINCT stock_code FROM holdings_snapshots
       WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM holdings_snapshots)
       ORDER BY stock_code`
    )
    .all<{ stock_code: string }>();

  let totalRows = 0;
  for (const s of stocks) {
    try {
      const rows = await fetchStockEPS(s.stock_code, `${year}-01-01`);
      if (rows.length > 0) {
        await batchUpsertEPS(db, rows);
        totalRows += rows.length;
      }
    } catch (e) {
      console.error(`[eps] ${s.stock_code}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return { rows: totalRows };
}

async function batchUpsertEPS(
  db: D1Database,
  rows: QuarterlyEPSRow[]
): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO quarterly_eps
           (stock_code, report_year, report_quarter, eps, revenue,
            operating_income, pre_tax_income, net_income)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.stock_code,
          r.report_year,
          r.report_quarter,
          r.eps,
          r.revenue,
          r.operating_income,
          r.pre_tax_income,
          r.net_income
        )
    );
    await db.batch(stmts);
  }
}
