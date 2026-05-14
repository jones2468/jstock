import { useQuery } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

export interface DashboardRow {
  stock_code: string;
  stock_name: string | null;
  current_price: number | null;
  change_val: number | null;
  price_date: string | null;
  trailing_eps: number | null;
  trailing_pe: number | null;
  institutional_net_5d: number | null;
  etf_count: number;
  etf_add_14d: number;
  etf_remove_14d: number;
}

export function useWatchlistDashboard(codes: string[]) {
  const sortedCodes = [...codes].sort();
  return useQuery({
    queryKey: ["watchlist-dashboard", sortedCodes],
    queryFn: () =>
      apiPost<DashboardRow[]>("/api/v1/watchlist/dashboard", {
        codes: sortedCodes,
      }),
    enabled: codes.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
