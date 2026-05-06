import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface HoldingRow {
  stock_code: string;
  stock_name: string;
  weight_pct: number;
  shares: number | null;
}

export interface DiffRow {
  stock_code: string;
  stock_name: string;
  diff_type: "new" | "removed" | "increased" | "decreased";
  today_weight: number | null;
  prev_weight: number | null;
  weight_change: number | null;
  today_shares: number | null;
  prev_shares: number | null;
}

export function useHoldings(etfCode: string, date?: string) {
  return useQuery({
    queryKey: ["holdings", etfCode, date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<HoldingRow[]>(`/api/v1/holdings/${etfCode}${params}`);
    },
    enabled: !!etfCode,
  });
}

export function useDiffs(etfCode: string, date?: string) {
  return useQuery({
    queryKey: ["diffs", etfCode, date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<DiffRow[]>(`/api/v1/holdings/${etfCode}/diffs${params}`);
    },
    enabled: !!etfCode,
  });
}
