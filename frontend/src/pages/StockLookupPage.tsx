import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { usePrices, useIndicators } from "@/hooks/use-prices";
import { useStockETFs } from "@/hooks/use-stock";
import { useFavorites } from "@/hooks/use-favorites";
import { KLineChart } from "@/components/chart/KLineChart";
import { RSIChart } from "@/components/chart/RSIChart";
import { MACDChart } from "@/components/chart/MACDChart";
import { StockETFList } from "@/components/stock/StockETFList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const stockCode = code ?? "";

  const { data: prices, isLoading: pLoading } = usePrices(stockCode);
  const { data: indicators, isLoading: iLoading } = useIndicators(stockCode);
  const { data: etfs } = useStockETFs(stockCode);
  const { isFavorite, toggle } = useFavorites();

  const latestPrice = prices?.[prices.length - 1];
  const isLoading = pLoading || iLoading;

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
                    latestPrice.change_val >= 0 ? "text-red-400" : "text-green-400"
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
          <Star className="h-5 w-5" fill={isFavorite(stockCode) ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Charts */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !prices?.length ? (
        <EmptyState message="尚無股價資料（排程可能尚未執行）" />
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-surface-secondary p-3">
            <div className="mb-1 flex items-center gap-4 text-xs text-slate-500">
              <span>K 線圖</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 bg-amber-500" /> MA5
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 bg-blue-500" /> MA20
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 bg-purple-500" /> MA60
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 bg-slate-500" style={{ borderTop: "1px dashed" }} /> BB
              </span>
            </div>
            <KLineChart prices={prices} indicators={indicators ?? []} />
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <RSIChart indicators={indicators ?? []} />
            </div>
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <MACDChart indicators={indicators ?? []} />
            </div>
          </div>
        </div>
      )}

      {/* ETF Holdings */}
      {etfs && etfs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold">持有此股票的 ETF ({etfs.length})</h2>
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <StockETFList etfs={etfs} />
          </div>
        </div>
      )}
    </div>
  );
}
