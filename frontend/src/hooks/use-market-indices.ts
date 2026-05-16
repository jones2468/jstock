import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface IndexPoint {
  date: string;
  close: number | null;
  change: number | null;
  pct: number | null;
}

export type IndicesData = Record<string, IndexPoint[]>;

export function useMarketIndices(days = 30) {
  return useQuery({
    queryKey: ["market-indices", days],
    queryFn: () => apiFetch<IndicesData>(`/api/v1/market/indices?days=${days}`),
    staleTime: 5 * 60 * 1000,
  });
}
