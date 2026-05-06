import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface RadarRow {
  stock_code: string;
  stock_name: string;
  etf_codes: string;
  etf_count: number;
}

export function useRadarNew(date?: string) {
  return useQuery({
    queryKey: ["radar-new", date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<RadarRow[]>(`/api/v1/radar/new${params}`);
    },
  });
}

export function useRadarRemoved(date?: string) {
  return useQuery({
    queryKey: ["radar-removed", date],
    queryFn: () => {
      const params = date ? `?date=${date}` : "";
      return apiFetch<RadarRow[]>(`/api/v1/radar/removed${params}`);
    },
  });
}

export function useRadarSyncAdd(days = 5, minEtfs = 2) {
  return useQuery({
    queryKey: ["radar-sync-add", days, minEtfs],
    queryFn: () =>
      apiFetch<RadarRow[]>(`/api/v1/radar/sync-add?days=${days}&min_etfs=${minEtfs}`),
  });
}

export function useRadarSyncReduce(days = 5, minEtfs = 2) {
  return useQuery({
    queryKey: ["radar-sync-reduce", days, minEtfs],
    queryFn: () =>
      apiFetch<RadarRow[]>(`/api/v1/radar/sync-reduce?days=${days}&min_etfs=${minEtfs}`),
  });
}
