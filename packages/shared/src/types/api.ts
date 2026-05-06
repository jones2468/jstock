export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface CronStatus {
  job_name: string;
  last_run: string | null;
  status: string | null;
  record_count: number | null;
}

export interface MetaStatus {
  cron_jobs: CronStatus[];
  last_updated: string | null;
}
