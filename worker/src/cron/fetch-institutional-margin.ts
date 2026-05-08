// 16:30 TST 收盤後抓三大法人 + 融資融券（上市 + 上櫃）
// 全市場全存

import type { Env } from "../env";
import {
  fetchTWSEInstitutional,
  fetchTPEXInstitutional,
  type InstitutionalRow,
} from "../data-sources/institutional";
import {
  fetchTWSEMargin,
  fetchTPEXMargin,
  type MarginRow,
} from "../data-sources/margin";
import { logCronRun } from "./log";
import { getTwMarketDate } from "../utils/date";

export async function runFetchInstitutionalMargin(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();

  let instCount = 0;
  let marginCount = 0;
  const errors: string[] = [];

  try {
    const [twseInst, tpexInst] = await Promise.allSettled([
      fetchTWSEInstitutional(),
      fetchTPEXInstitutional(),
    ]);
    const instRows: InstitutionalRow[] = [];
    if (twseInst.status === "fulfilled") instRows.push(...twseInst.value);
    else errors.push(`TWSE inst: ${twseInst.reason}`);
    if (tpexInst.status === "fulfilled") instRows.push(...tpexInst.value);
    else errors.push(`TPEX inst: ${tpexInst.reason}`);

    if (instRows.length > 0) {
      // 改用今日交易日（避免 cron 跑在台灣時區邊界時的 date drift）
      for (const r of instRows) r.trade_date = today;
      await batchUpsertInstitutional(db, instRows);
      instCount = instRows.length;
    }
  } catch (e) {
    errors.push(`inst: ${(e as Error).message}`);
  }

  try {
    const [twseMargin, tpexMargin] = await Promise.allSettled([
      fetchTWSEMargin(),
      fetchTPEXMargin(),
    ]);
    const marginRows: MarginRow[] = [];
    if (twseMargin.status === "fulfilled") marginRows.push(...twseMargin.value);
    else errors.push(`TWSE margin: ${twseMargin.reason}`);
    if (tpexMargin.status === "fulfilled") marginRows.push(...tpexMargin.value);
    else errors.push(`TPEX margin: ${tpexMargin.reason}`);

    if (marginRows.length > 0) {
      for (const r of marginRows) r.trade_date = today;
      await batchUpsertMargin(db, marginRows);
      marginCount = marginRows.length;
    }
  } catch (e) {
    errors.push(`margin: ${(e as Error).message}`);
  }

  await logCronRun(db, {
    jobName: "fetch_institutional_margin",
    runDate: today,
    status: errors.length === 0 ? "success" : instCount + marginCount > 0 ? "partial" : "failed",
    etfCount: 0,
    recordCount: instCount + marginCount,
    errorMessage: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
    startedAt,
  });

  console.log(
    `[inst-margin] inst=${instCount} margin=${marginCount} errors=${errors.length}`
  );
}

async function batchUpsertInstitutional(
  db: D1Database,
  rows: InstitutionalRow[]
): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO daily_institutional
           (trade_date, stock_code,
            foreign_buy, foreign_sell, foreign_net,
            invest_buy, invest_sell, invest_net,
            dealer_buy, dealer_sell, dealer_net,
            total_net)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.trade_date,
          r.stock_code,
          r.foreign_buy,
          r.foreign_sell,
          r.foreign_net,
          r.invest_buy,
          r.invest_sell,
          r.invest_net,
          r.dealer_buy,
          r.dealer_sell,
          r.dealer_net,
          r.total_net
        )
    );
    await db.batch(stmts);
  }
}

async function batchUpsertMargin(db: D1Database, rows: MarginRow[]): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO daily_margin
           (trade_date, stock_code,
            margin_buy, margin_sell, margin_redeem, margin_balance, margin_limit,
            short_sell, short_buy, short_redeem, short_balance, short_limit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.trade_date,
          r.stock_code,
          r.margin_buy,
          r.margin_sell,
          r.margin_redeem,
          r.margin_balance,
          r.margin_limit,
          r.short_sell,
          r.short_buy,
          r.short_redeem,
          r.short_balance,
          r.short_limit
        )
    );
    await db.batch(stmts);
  }
}
