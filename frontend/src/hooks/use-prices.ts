import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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

function dateRange(monthsBack: number) {
  const end = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  const start = d.toISOString().slice(0, 10);
  return { start, end };
}

export function usePrices(stockCode: string, start: string, end: string) {
  return useQuery({
    queryKey: ["prices", stockCode, start, end],
    queryFn: () =>
      apiFetch<PriceRow[]>(
        `/api/v1/chart/${stockCode}/prices?start=${start}&end=${end}`
      ),
    enabled: !!stockCode,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIndicators(stockCode: string, start: string, end: string) {
  return useQuery({
    queryKey: ["indicators", stockCode, start, end],
    queryFn: () =>
      apiFetch<IndicatorRow[]>(
        `/api/v1/chart/${stockCode}/indicators?start=${start}&end=${end}`
      ),
    enabled: !!stockCode,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockChartData(code: string) {
  const [monthsBack, setMonthsBack] = useState(6);

  const { start, end } = useMemo(() => dateRange(monthsBack), [monthsBack]);

  const {
    data: prices,
    isLoading: pLoading,
    isFetching: pFetching,
  } = usePrices(code, start, end);

  const {
    data: indicators,
    isLoading: iLoading,
    isFetching: iFetching,
  } = useIndicators(code, start, end);

  const loadMore = useCallback(() => {
    if (!pFetching && !iFetching) {
      setMonthsBack((m) => m + 6);
    }
  }, [pFetching, iFetching]);

  return {
    prices: prices ?? [],
    indicators: indicators ?? [],
    isLoading: pLoading || iLoading,
    isLoadingMore: (pFetching || iFetching) && !pLoading && !iLoading,
    loadMore,
    monthsBack,
  };
}
