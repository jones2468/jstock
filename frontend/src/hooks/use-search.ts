import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface StockHit {
  code: string;
  name: string;
  market: string | null;
  industry: string | null;
}

export interface ETFHit {
  code: string;
  name: string;
  issuer: string | null;
  etf_type: string | null;
  market: string | null;
}

export interface SearchResults {
  stocks: StockHit[];
  etfs: ETFHit[];
}

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["global-search", q],
    queryFn: () =>
      apiFetch<SearchResults>(`/api/v1/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 1,
    staleTime: 60_000,
  });
}
