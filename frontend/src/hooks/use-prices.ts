import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PriceRow {
  price_date: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number;
  volume: number | null;
  change_val: number | null;
}

export interface IndicatorRow {
  date: string;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  rsi: number | null;
  macd_line: number | null;
  signal_line: number | null;
  histogram: number | null;
}

export function usePrices(stockCode: string, days = 120) {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["prices", stockCode, start, end],
    queryFn: () =>
      apiFetch<PriceRow[]>(`/api/v1/chart/${stockCode}/prices?start=${start}&end=${end}`),
    enabled: !!stockCode,
  });
}

export function useIndicators(stockCode: string, days = 120) {
  return useQuery({
    queryKey: ["indicators", stockCode, days],
    queryFn: () =>
      apiFetch<IndicatorRow[]>(`/api/v1/chart/${stockCode}/indicators?days=${days}`),
    enabled: !!stockCode,
  });
}
