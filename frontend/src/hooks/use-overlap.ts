import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface OverlapCompareResult {
  etf_codes: string[];
  common_stocks: Array<{
    stock_code: string;
    stock_name: string;
    weights: Record<string, number>;
  }>;
  overlap_count: number;
}

export interface OverlapMatrixRow {
  etf_a: string;
  etf_b: string;
  overlap_count: number;
}

export function useOverlapCompare(etfCodes: string[], date?: string) {
  const codes = etfCodes.join(",");
  return useQuery({
    queryKey: ["overlap-compare", codes, date],
    queryFn: () => {
      const params = date ? `&date=${date}` : "";
      return apiFetch<OverlapCompareResult>(`/api/v1/overlap/compare?etfs=${codes}${params}`);
    },
    enabled: etfCodes.length >= 2,
  });
}

export function useOverlapMatrix(date?: string) {
  return useQuery({
    queryKey: ["overlap-matrix", date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<OverlapMatrixRow[]>(`/api/v1/overlap/matrix${params}`);
    },
  });
}
