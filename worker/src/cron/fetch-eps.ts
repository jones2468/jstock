// 季 EPS 抓取 cron job
// 每季一次（Q1: 5/16, Q2: 8/15, Q3: 11/15, Q4: 3/31）
import type { Env } from "../env";
import {
  fetchQuarterlyEPS,
  targetEPSQuarter,
  type QuarterlyEPSRow,
} from "../data-sources/mops-eps";
import { logCronRun } from "./log";

export async function runFetchEPS(env: Env): Promise<void> {
  const db = env.DB;
  const startedAt = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const { year, quarter } = targetEPSQuarter();

  try {
    const rows = await fetchQuarterlyEPS(year, quarter);
    console.log(`[eps] fetched ${rows.length} rows for ${year}Q${quarter}`);

    if (rows.length > 0) {
      await batchUpsertEPS(db, rows);
    }

    await logCronRun(db, {
      jobName: "fetch_eps",
      runDate: today,
      status: rows.length > 0 ? "success" : "partial",
      etfCount: 0,
      recordCount: rows.length,
      errorMessage:
        rows.length === 0 ? `no rows for ${year}Q${quarter}` : null,
      startedAt,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[eps] error: ${msg}`);
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
 * 抓指定年度 + 季度的 EPS（admin 手動補抓用）
 */
export async function runFetchEPSForQuarter(
  env: Env,
  year: number,
  quarter: number
): Promise<{ rows: number }> {
  const rows = await fetchQuarterlyEPS(year, quarter);
  if (rows.length > 0) {
    await batchUpsertEPS(env.DB, rows);
  }
  return { rows: rows.length };
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
