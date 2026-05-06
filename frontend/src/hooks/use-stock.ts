import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface StockETFRow {
  etf_code: string;
  etf_name: string;
  weight_pct: number;
  shares: number | null;
  diff_type: string | null;
  weight_change: number | null;
}

export function useStockETFs(stockCode: string, date?: string) {
  return useQuery({
    queryKey: ["stock-etfs", stockCode, date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<StockETFRow[]>(`/api/v1/stocks/${stockCode}/etfs${params}`);
    },
    enabled: !!stockCode,
  });
}

export function useStockSearch(q: string) {
  return useQuery({
    queryKey: ["stock-search", q],
    queryFn: () =>
      apiFetch<Array<{ stock_code: string; stock_name: string }>>(
        `/api/v1/stocks/search?q=${encodeURIComponent(q)}`
      ),
    enabled: q.length >= 1,
  });
}
