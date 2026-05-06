import type { Env } from "../env";
import { ACTIVE_ETFS, CRON_JOBS } from "@jstock/shared";
import { logCronRun } from "./log";
import { getTwMarketDate, getPrevTradingDate } from "../utils/date";

interface HoldingRow {
  stock_code: string;
  stock_name: string;
  weight_pct: number;
  shares: number | null;
}

export async function runComputeDiffs(env: Env): Promise<void> {
  const db = env.DB;
  const today = getTwMarketDate();
  const startedAt = new Date().toISOString();

  const prevDate = await getPrevTradingDate(db, today);
  if (!prevDate) {
    console.log("[diffs] no previous date found, skipping");
    await logCronRun(db, {
      jobName: CRON_JOBS.COMPUTE_DIFFS,
      runDate: today,
      status: "success",
      etfCount: 0,
      recordCount: 0,
      errorMessage: "no previous snapshot to compare",
      startedAt,
    });
    return;
  }

  let totalDiffs = 0;
  let etfCount = 0;
  const errors: string[] = [];

  for (const etf of ACTIVE_ETFS) {
    try {
      const diffs = await computeEtfDiffs(db, today, prevDate, etf.code);
      if (diffs > 0) {
        totalDiffs += diffs;
        etfCount++;
      }
    } catch (err) {
      errors.push(`${etf.code}: ${(err as Error).message}`);
    }
  }

  await logCronRun(db, {
    jobName: CRON_JOBS.COMPUTE_DIFFS,
    runDate: today,
    status: errors.length === 0 ? "success" : etfCount > 0 ? "partial" : "failed",
    etfCount,
    recordCount: totalDiffs,
    errorMessage: errors.length > 0 ? errors.join("; ") : null,
    startedAt,
  });

  console.log(`[diffs] done: ${etfCount} ETFs, ${totalDiffs} diffs (${today} vs ${prevDate})`);
}

async function computeEtfDiffs(
  db: D1Database,
  today: string,
  prevDate: string,
  etfCode: string
): Promise<number> {
  const [todayRows, prevRows] = await Promise.all([
    db
      .prepare(
        "SELECT stock_code, stock_name, weight_pct, shares FROM holdings_snapshots WHERE etf_code = ? AND snapshot_date = ?"
      )
      .bind(etfCode, today)
      .all<HoldingRow>(),
    db
      .prepare(
        "SELECT stock_code, stock_name, weight_pct, shares FROM holdings_snapshots WHERE etf_code = ? AND snapshot_date = ?"
      )
      .bind(etfCode, prevDate)
      .all<HoldingRow>(),
  ]);

  if (!todayRows.results.length) return 0;

  const todayMap = new Map(todayRows.results.map((r) => [r.stock_code, r]));
  const prevMap = new Map(prevRows.results.map((r) => [r.stock_code, r]));

  const stmts: D1PreparedStatement[] = [];

  // New + increased/decreased
  for (const [code, t] of todayMap) {
    const p = prevMap.get(code);
    if (!p) {
      stmts.push(makeDiffStmt(db, today, etfCode, t, null, "new"));
    } else {
      const change = Math.round((t.weight_pct - p.weight_pct) * 100) / 100;
      if (change > 0.001) {
        stmts.push(makeDiffStmt(db, today, etfCode, t, p, "increased"));
      } else if (change < -0.001) {
        stmts.push(makeDiffStmt(db, today, etfCode, t, p, "decreased"));
      }
    }
  }

  // Removed
  for (const [code, p] of prevMap) {
    if (!todayMap.has(code)) {
      stmts.push(makeDiffStmt(db, today, etfCode, null, p, "removed"));
    }
  }

  if (stmts.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
      await db.batch(stmts.slice(i, i + BATCH_SIZE));
    }
  }

  return stmts.length;
}

function makeDiffStmt(
  db: D1Database,
  date: string,
  etfCode: string,
  today: HoldingRow | null,
  prev: HoldingRow | null,
  diffType: string
): D1PreparedStatement {
  const stockCode = (today ?? prev)!.stock_code;
  const stockName = (today ?? prev)!.stock_name;
  const todayWeight = today?.weight_pct ?? null;
  const prevWeight = prev?.weight_pct ?? null;
  const weightChange =
    todayWeight != null && prevWeight != null
      ? Math.round((todayWeight - prevWeight) * 100) / 100
      : null;

  return db
    .prepare(
      `INSERT OR REPLACE INTO holdings_diffs
       (diff_date, etf_code, stock_code, stock_name, diff_type, today_weight, prev_weight, weight_change, today_shares, prev_shares)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      date,
      etfCode,
      stockCode,
      stockName,
      diffType,
      todayWeight,
      prevWeight,
      weightChange,
      today?.shares ?? null,
      prev?.shares ?? null
    );
}
