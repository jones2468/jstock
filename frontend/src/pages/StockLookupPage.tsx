import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useStockChartData } from "@/hooks/use-prices";
import { useStockETFs } from "@/hooks/use-stock";
import { useFavorites } from "@/hooks/use-favorites";
import { SyncedStockChart } from "@/components/chart/SyncedStockChart";
import { StockETFList } from "@/components/stock/StockETFList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const stockCode = code ?? "";

  const { prices, indicators, isLoading, isLoadingMore, loadMore } =
    useStockChartData(stockCode);
  const { data: etfs } = useStockETFs(stockCode);
  const { isFavorite, toggle } = useFavorites();

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{stockCode}</h1>
          {latestPrice && (
            <div className="mt-1 flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums">
                {latestPrice.close_price.toLocaleString()}
              </span>
              {latestPrice.change_val != null && (
                <span
                  className={`text-sm font-medium ${
                    latestPrice.change_val >= 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {latestPrice.change_val >= 0 ? "+" : ""}
                  {latestPrice.change_val.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => toggle(stockCode)}
          className={`rounded-md p-2 transition-colors ${
            isFavorite(stockCode)
              ? "bg-amber-400/10 text-amber-400"
              : "bg-surface-secondary text-slate-500 hover:text-slate-300"
          }`}
          title={isFavorite(stockCode) ? "移除自選" : "加入自選"}
        >
          <Star
            className="h-5 w-5"
            fill={isFavorite(stockCode) ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Charts */}
      {isLoading ? (
        <LoadingSpinner />
      ) : prices.length === 0 ? (
        <EmptyState message="尚無股價資料（排程可能尚未執行）" />
      ) : (
        <div className="rounded-lg border border-border bg-surface-secondary p-3">
          <SyncedStockChart
            prices={prices}
            indicators={indicators}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
          />
        </div>
      )}

      {/* ETF Holdings */}
      {etfs && etfs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold">
            持有此股票的 ETF ({etfs.length})
          </h2>
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <StockETFList etfs={etfs} />
          </div>
        </div>
      )}
    </div>
  );
}
