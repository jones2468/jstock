import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ETFRow {
  etf_code: string;
  etf_name: string;
  issuer: string;
  group_tag: string;
  aum: number | null;
  updated_at: string;
}

export interface ETFDiffSummary {
  new: number;
  removed: number;
  increased: number;
  decreased: number;
}

export function useETFs(group?: string) {
  return useQuery({
    queryKey: ["etfs", group],
    queryFn: () => {
      const params = group ? `?group=${group}` : "";
      return apiFetch<ETFRow[]>(`/api/v1/etfs${params}`);
    },
  });
}

export function useETFDiffSummary(etfCode: string, date?: string) {
  return useQuery({
    queryKey: ["etf-diffs", etfCode, date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<Array<{ diff_type: string }>>(`/api/v1/holdings/${etfCode}/diffs${params}`);
    },
    select(data) {
      const summary: ETFDiffSummary = { new: 0, removed: 0, increased: 0, decreased: 0 };
      for (const d of data) {
        if (d.diff_type in summary) {
          summary[d.diff_type as keyof ETFDiffSummary]++;
        }
      }
      return summary;
    },
  });
}
