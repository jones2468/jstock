import { Link } from "react-router-dom";
import { Star, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/use-favorites";
import { apiPost } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface BatchPriceRow {
  stock_code: string;
  stock_name: string;
  close_price: number;
  change_val: number | null;
}

export function WatchlistPage() {
  const { favorites, toggle } = useFavorites();

  const { data: prices, isLoading } = useQuery({
    queryKey: ["watchlist-prices", favorites],
    queryFn: () =>
      apiPost<BatchPriceRow[]>("/api/v1/stocks/batch-prices", {
        stocks: favorites,
      }),
    enabled: favorites.length > 0,
  });

  const priceMap = new Map(prices?.map((p) => [p.stock_code, p]));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
        <h1 className="text-xl font-bold">自選股</h1>
        <span className="text-sm text-slate-500">({favorites.length})</span>
      </div>

      {favorites.length === 0 ? (
        <EmptyState message="還沒有自選股。在個股頁面點星號加入。" />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-500">
                <th className="pb-2 pr-4">股票</th>
                <th className="pb-2 pr-4 text-right">收盤價</th>
                <th className="pb-2 pr-4 text-right">漲跌</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {favorites.map((code) => {
                const p = priceMap.get(code);
                return (
                  <tr key={code} className="border-b border-border/50 hover:bg-surface-secondary/50">
                    <td className="py-3 pr-4">
                      <Link to={`/stock/${code}`} className="text-accent hover:underline">
                        {p?.stock_name ?? code}
                      </Link>
                      <span className="ml-1 text-xs text-slate-500">{code}</span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-medium">
                      {p?.close_price?.toLocaleString() ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {p?.change_val != null ? (
                        <span className={p.change_val >= 0 ? "text-red-400" : "text-green-400"}>
                          {p.change_val >= 0 ? "+" : ""}
                          {p.change_val.toFixed(2)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggle(code)}
                        className="rounded p-1 text-slate-600 hover:bg-red-400/10 hover:text-red-400"
                        title="移除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
