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
import { DashboardCard } from "@/components/stock/DashboardCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const stockCode = code ?? "";

  const { prices, indicators, isLoading, isLoadingMore, loadMore } =
    useStockChartData(stockCode);
  const { data: etfs } = useStockETFs(stockCode);
  const { data: valuation } = useValuation(stockCode);
  const { isFavorite, toggle } = useFavorites();

  // EPS 卡內切換：估值 / 估值河流
  const [epsView, setEpsView] = useState<"eps" | "river">("eps");

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
  const stockName = valuation?.stock_name ?? null;
  const displayPrice = latestPrice?.close_price ?? valuation?.current_price ?? null;
  const displayChange = latestPrice?.change_val ?? valuation?.change_val ?? null;

  return (
    <div>
      {/* 麵包屑 */}
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

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
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

      {/* 研判總覽（橫向長條） */}
      <ValuationCard code={stockCode} />

      {/*
        Dashboard grid
        - lg+ 桌面：12 欄  → K 線占 col-span-8 row-span-2、其他 col-span-4
        - md  中型：2 欄
        - 手機：1 欄垂直 stack
      */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]">
        {/* K 線：大卡 */}
        <div className="md:col-span-2 lg:col-span-8 lg:row-span-2">
          <DashboardCard title="股價 K 線" maxHeight="560px">
            {isLoading ? (
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
            )}
          </DashboardCard>
        </div>

        {/* EPS / 估值（含估值河流切換）*/}
        <div className="lg:col-span-4">
          <DashboardCard
            title="EPS / 估值"
            maxHeight="320px"
            extra={
              <div className="flex gap-0.5 rounded-md bg-surface p-0.5 text-[11px]">
                <button
                  onClick={() => setEpsView("eps")}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    epsView === "eps"
                      ? "bg-accent/20 text-accent"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  季 EPS
                </button>
                <button
                  onClick={() => setEpsView("river")}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    epsView === "river"
                      ? "bg-accent/20 text-accent"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  估值河流
                </button>
              </div>
            }
          >
            {epsView === "eps" ? (
              <EPSTab code={stockCode} />
            ) : (
              <PERiverChart code={stockCode} />
            )}
          </DashboardCard>
        </div>

        {/* 月營收 */}
        <div className="lg:col-span-4">
          <DashboardCard title="月營收" maxHeight="220px">
            <RevenueTab code={stockCode} />
          </DashboardCard>
        </div>

        {/* 三大法人 */}
        <div className="lg:col-span-4">
          <DashboardCard title="三大法人" maxHeight="320px">
            <InstitutionalTab code={stockCode} />
          </DashboardCard>
        </div>

        {/* 融資融券 */}
        <div className="lg:col-span-4">
          <DashboardCard title="融資融券" maxHeight="320px">
            <MarginTab code={stockCode} />
          </DashboardCard>
        </div>

        {/* ETF 持倉 */}
        <div className="lg:col-span-4">
          <DashboardCard title="ETF 持倉" maxHeight="320px">
            {etfs && etfs.length > 0 ? (
              <StockETFList etfs={etfs} />
            ) : (
              <EmptyState message="此股票目前未被任何 ETF 持有" />
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
