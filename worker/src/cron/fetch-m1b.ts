import type { Env } from "../env";
import { fetchM1BFromIMF, type M1BRow } from "../data-sources/imf";
import { logCronRun } from "./log";

export async function runFetchM1B(env: Env): Promise<{ rows: number }> {
  const db = env.DB;
  const today = new Date().toISOString().slice(0, 10);
  const startedAt = new Date().toISOString();

  try {
    const startYear = new Date().getFullYear() - 2;
    const rows = await fetchM1BFromIMF(startYear);

    if (rows.length === 0) {
      console.log("[m1b] no data from IMF");
      await logCronRun(db, {
        jobName: "fetch_m1b",
        runDate: today,
        status: "partial",
        etfCount: 0,
        recordCount: 0,
        errorMessage: "no data from IMF IFS",
        startedAt,
      });
      return { rows: 0 };
    }

    await batchUpsertM1B(db, rows);
    console.log(`[m1b] upserted ${rows.length} months from IMF`);

    await logCronRun(db, {
      jobName: "fetch_m1b",
      runDate: today,
      status: "success",
      etfCount: 0,
      recordCount: rows.length,
      errorMessage: null,
      startedAt,
    });
    return { rows: rows.length };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[m1b] error: ${msg}`);
    await logCronRun(db, {
      jobName: "fetch_m1b",
      runDate: today,
      status: "failed",
      etfCount: 0,
      recordCount: 0,
      errorMessage: msg,
      startedAt,
    });
    return { rows: 0 };
  }
}

async function batchUpsertM1B(db: D1Database, rows: M1BRow[]): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO monthly_m1b
           (report_date, m1b, m2, m1b_yoy_pct)
           VALUES (?, ?, ?, ?)`
        )
        .bind(r.report_date, r.m1b, r.m2, r.m1b_yoy_pct)
    );
    await db.batch(stmts);
  }
}
