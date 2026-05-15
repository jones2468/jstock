import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Star } from "lucide-react";
import { useStockChartData } from "@/hooks/use-prices";
import { useStockETFs } from "@/hooks/use-stock";
import { useFavorites } from "@/hooks/use-favorites";
import { useValuation } from "@/hooks/use-stock-detail";
import { SyncedStockChart } from "@/components/chart/SyncedStockChart";
import { PERiverChart } from "@/components/chart/PERiverChart";
import { StockETFList } from "@/components/stock/StockETFList";
import { InstitutionalTab } from "@/components/stock/InstitutionalTab";
import { MarginTab } from "@/components/stock/MarginTab";
import { RevenueTab } from "@/components/stock/RevenueTab";
import { EPSTab } from "@/components/stock/EPSTab";
import { ValuationCard } from "@/components/stock/ValuationCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab =
  | "chart"
  | "river"
  | "institutional"
  | "margin"
  | "revenue"
  | "eps"
  | "etfs";

const TABS: { key: Tab; label: string }[] = [
  { key: "chart", label: "走勢圖" },
  { key: "river", label: "估值河流" },
  { key: "eps", label: "EPS / 估值" },
  { key: "institutional", label: "三大法人" },
  { key: "margin", label: "融資融券" },
  { key: "revenue", label: "月營收" },
  { key: "etfs", label: "ETF 持倉" },
];

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const stockCode = code ?? "";
  const [tab, setTab] = useState<Tab>("chart");

  const { prices, indicators, isLoading, isLoadingMore, loadMore } =
    useStockChartData(stockCode);
  const { data: etfs } = useStockETFs(stockCode);
  const { data: valuation } = useValuation(stockCode);
  const { isFavorite, toggle } = useFavorites();

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
  const stockName = valuation?.stock_name ?? null;
  // 優先用最新走勢圖資料，沒有就用 valuation 的 latest
  const displayPrice = latestPrice?.close_price ?? valuation?.current_price ?? null;
  const displayChange = latestPrice?.change_val ?? valuation?.change_val ?? null;

  return (
    <div>
      {/* 麵包屑 / 返回 */}
      <nav className="mb-3 flex items-center gap-1 text-xs text-slate-500">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-surface-secondary hover:text-slate-300"
          title="返回上一頁"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <span className="mx-1 text-slate-700">/</span>
        <Link to="/" className="hover:text-slate-300">
          觀察清單
        </Link>
        <span className="mx-1 text-slate-700">/</span>
        <span className="text-slate-400">
          {stockName ? `${stockName} ${stockCode}` : stockCode}
        </span>
      </nav>

      {/* Header：鴻海 2317 | 251 +1.00 */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold">
            {stockName ?? stockCode}
            {stockName && (
              <span className="ml-2 text-base font-normal text-slate-400">
                {stockCode}
              </span>
            )}
          </h1>
          {displayPrice != null && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-2xl font-bold tabular-nums">
                {displayPrice.toLocaleString()}
              </span>
              {displayChange != null && (
                <span
                  className={`text-sm font-medium tabular-nums ${
                    displayChange >= 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {displayChange >= 0 ? "+" : ""}
                  {displayChange.toFixed(2)}
                </span>
              )}
            </>
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

      {/* Tabs（手機橫向滑動） */}
      <div className="mb-4 -mx-3 overflow-x-auto border-b border-border sm:mx-0">
        <div className="flex min-w-max gap-1 px-3 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative shrink-0 px-3 py-2 text-sm transition-colors sm:px-4 ${
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
              trailingEps={valuation?.trailing_eps ?? null}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
            />
          ))}

        {tab === "river" && <PERiverChart code={stockCode} />}
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
