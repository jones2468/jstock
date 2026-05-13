import { useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useStockChartData } from "@/hooks/use-prices";
import { useStockETFs } from "@/hooks/use-stock";
import { useFavorites } from "@/hooks/use-favorites";
import { SyncedStockChart } from "@/components/chart/SyncedStockChart";
import { StockETFList } from "@/components/stock/StockETFList";
import { InstitutionalTab } from "@/components/stock/InstitutionalTab";
import { MarginTab } from "@/components/stock/MarginTab";
import { RevenueTab } from "@/components/stock/RevenueTab";
import { EPSTab } from "@/components/stock/EPSTab";
import { ValuationCard } from "@/components/stock/ValuationCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "chart" | "institutional" | "margin" | "revenue" | "eps" | "etfs";

const TABS: { key: Tab; label: string }[] = [
  { key: "chart", label: "走勢圖" },
  { key: "eps", label: "EPS / 估值" },
  { key: "institutional", label: "三大法人" },
  { key: "margin", label: "融資融券" },
  { key: "revenue", label: "月營收" },
  { key: "etfs", label: "ETF 持倉" },
];

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const stockCode = code ?? "";
  const [tab, setTab] = useState<Tab>("chart");

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

      {/* Valuation Summary Card */}
      <ValuationCard code={stockCode} />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? "text-accent"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="rounded-lg border border-border bg-surface-secondary p-3">
        {tab === "chart" &&
          (isLoading ? (
            <LoadingSpinner />
          ) : prices.length === 0 ? (
            <EmptyState message="尚無股價資料（排程可能尚未執行）" />
          ) : (
            <SyncedStockChart
              prices={prices}
              indicators={indicators}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
            />
          ))}

        {tab === "eps" && <EPSTab code={stockCode} />}
        {tab === "institutional" && <InstitutionalTab code={stockCode} />}
        {tab === "margin" && <MarginTab code={stockCode} />}
        {tab === "revenue" && <RevenueTab code={stockCode} />}

        {tab === "etfs" &&
          (etfs && etfs.length > 0 ? (
            <StockETFList etfs={etfs} />
          ) : (
            <EmptyState message="此股票目前未被任何 ETF 持有（或尚無持倉資料）" />
          ))}
      </div>
    </div>
  );
}
