import { useQuery } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

export function useWatchlistSparklines(codes: string[]) {
  const sortedCodes = [...codes].sort();
  return useQuery({
    queryKey: ["watchlist-sparklines", sortedCodes],
    queryFn: () =>
      apiPost<Record<string, number[]>>("/api/v1/watchlist/sparklines", {
        codes: sortedCodes,
        days: 30,
      }),
    enabled: codes.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}
