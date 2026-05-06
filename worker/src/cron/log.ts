export interface CronRunParams {
  jobName: string;
  runDate: string;
  status: "success" | "partial" | "failed";
  etfCount: number;
  recordCount: number;
  errorMessage: string | null;
  startedAt: string;
}

export async function logCronRun(db: D1Database, params: CronRunParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cron_runs (job_name, run_date, status, etf_count, record_count, error_message, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      params.jobName,
      params.runDate,
      params.status,
      params.etfCount,
      params.recordCount,
      params.errorMessage,
      params.startedAt
    )
    .run();
}
