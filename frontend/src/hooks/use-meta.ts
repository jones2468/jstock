import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface CronJob {
  job_name: string;
  last_run: string | null;
  status: string | null;
  record_count: number | null;
}

interface MetaStatus {
  cron_jobs: CronJob[];
  last_updated: string | null;
}

export function useMetaStatus() {
  return useQuery({
    queryKey: ["meta-status"],
    queryFn: () => apiFetch<MetaStatus>("/api/v1/meta/status"),
    refetchInterval: 60_000,
  });
}
