import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type Tone = "red" | "yellow" | "green" | "blue" | "gray";

export interface MarketHistoryRow {
  trade_date: string;
  taiex_close: number | null;
  taiex_change: number | null;
  taiex_change_pct: number | null;
  total_volume_value: number | null;
  total_margin_balance: number | null;
  total_short_balance: number | null;
}

export interface MarketTemperatureData {
  latest_date: string;
  taiex_close: number | null;
  taiex_change: number | null;
  taiex_change_pct: number | null;
  volume: {
    current: number | null;
    avg60: number | null;
    ratio: number | null;
    signal: Tone;
  };
  margin: {
    current: number | null;
    avg60: number | null;
    ratio: number | null;
    signal: Tone;
  };
  rsi: { value: number | null; signal: Tone };
  temperature: { score: number; label: string; tone: Tone };
  history: MarketHistoryRow[];
  m1b: {
    report_date: string;
    m1b: number | null;
    m2: number | null;
    m1b_yoy_pct: number | null;
  } | null;
}

export function useMarketTemperature() {
  return useQuery({
    queryKey: ["market-temperature"],
    queryFn: () =>
      apiFetch<MarketTemperatureData | null>("/api/v1/market/temperature"),
    staleTime: 5 * 60 * 1000,
  });
}
