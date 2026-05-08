// 每月 11 號跑：抓上個月的全市場月營收
import type { Env } from "../env";
import {
  fetchMonthlyRevenue,
  targetRevenueMonth,
  type RevenueRow,
} from "../data-sources/mops";
import { logCronRun } from "./log";

export async function runFetchRevenue(env: Env): Promise<void> {
  const db = env.DB;
  const startedAt = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const { year, month } = targetRevenueMonth();

  try {
    const rows = await fetchMonthlyRevenue(year, month);
    console.log(`[revenue] fetched ${rows.length} rows for ${year}-${month}`);

    if (rows.length > 0) {
      await batchUpsertRevenue(db, rows);
    }

    await logCronRun(db, {
      jobName: "fetch_revenue",
      runDate: today,
      status: rows.length > 0 ? "success" : "partial",
      etfCount: 0,
      recordCount: rows.length,
      errorMessage: rows.length === 0 ? `no rows for ${year}-${month}` : null,
      startedAt,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[revenue] error: ${msg}`);
    await logCronRun(db, {
      jobName: "fetch_revenue",
      runDate: today,
      status: "failed",
      etfCount: 0,
      recordCount: 0,
      errorMessage: msg,
      startedAt,
    });
  }
}

async function batchUpsertRevenue(db: D1Database, rows: RevenueRow[]): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO monthly_revenue
           (report_year, report_month, stock_code, revenue, yoy_pct, mom_pct, ytd_revenue, ytd_yoy_pct)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.report_year,
          r.report_month,
          r.stock_code,
          r.revenue,
          r.yoy_pct,
          r.mom_pct,
          r.ytd_revenue,
          r.ytd_yoy_pct
        )
    );
    await db.batch(stmts);
  }
}
