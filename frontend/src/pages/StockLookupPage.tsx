import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, RotateCcw, Star } from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
type Layouts = Record<string, LayoutItem[]>;
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
import { StockSettings } from "@/components/stock/StockSettings";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

const ResponsiveGridLayout = WidthProvider(Responsive);

const LAYOUT_STORAGE_KEY = "jstock_stock_dashboard_layout";

// 預設 layout：每個 breakpoint 12 columns
// 排列：K 線（左大）/ EPS 估值 / 月營收 / 三大法人 / 融資融券 / ETF 持倉
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "chart", x: 0, y: 0, w: 8, h: 16, minW: 4, minH: 8 },
    { i: "eps", x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 },
    { i: "revenue", x: 8, y: 8, w: 4, h: 8, minW: 3, minH: 4 },
    { i: "institutional", x: 0, y: 16, w: 4, h: 8, minW: 3, minH: 4 },
    { i: "margin", x: 4, y: 16, w: 4, h: 8, minW: 3, minH: 4 },
    { i: "etfs", x: 8, y: 16, w: 4, h: 8, minW: 3, minH: 4 },
  ],
  md: [
    { i: "chart", x: 0, y: 0, w: 12, h: 16, minH: 8 },
    { i: "eps", x: 0, y: 16, w: 6, h: 8 },
    { i: "revenue", x: 6, y: 16, w: 6, h: 8 },
    { i: "institutional", x: 0, y: 24, w: 6, h: 8 },
    { i: "margin", x: 6, y: 24, w: 6, h: 8 },
    { i: "etfs", x: 0, y: 32, w: 12, h: 8 },
  ],
  sm: [
    { i: "chart", x: 0, y: 0, w: 12, h: 14 },
    { i: "eps", x: 0, y: 14, w: 12, h: 8 },
    { i: "revenue", x: 0, y: 22, w: 12, h: 8 },
    { i: "institutional", x: 0, y: 30, w: 12, h: 8 },
    { i: "margin", x: 0, y: 38, w: 12, h: 8 },
    { i: "etfs", x: 0, y: 46, w: 12, h: 8 },
  ],
};

const BREAKPOINTS = { lg: 1200, md: 768, sm: 0 };
const COLS = { lg: 12, md: 12, sm: 12 };
const ROW_HEIGHT = 36;

function loadLayouts(): Layouts {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUTS;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : DEFAULT_LAYOUTS;
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

function saveLayouts(layouts: Layouts) {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
}

export function StockLookupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const stockCode = code ?? "";

  const { prices, indicators, isLoading, isLoadingMore, loadMore } =
    useStockChartData(stockCode);
  const { data: etfs } = useStockETFs(stockCode);
  const { data: valuation } = useValuation(stockCode);
  const { isFavorite, toggle } = useFavorites();

  const [layouts, setLayouts] = useState<Layouts>(loadLayouts);
  const [epsView, setEpsView] = useState<"eps" | "river">("eps");

  // layout change → save
  useEffect(() => {
    saveLayouts(layouts);
  }, [layouts]);

  const handleLayoutChange = (_current: LayoutItem[], all: Layouts) => {
    setLayouts(all);
  };

  const resetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  };

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
      <div className="mb-4 flex items-start justify-between gap-2">
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
        <div className="flex items-center gap-1">
          <button
            onClick={resetLayout}
            className="rounded-md bg-surface-secondary p-2 text-slate-500 transition-colors hover:text-slate-300"
            title="還原預設排版"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <StockSettings code={stockCode} />
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
      </div>

      {/* 研判總覽 */}
      <ValuationCard code={stockCode} />

      <div className="mt-3 text-[11px] text-slate-500">
        提示：拖拉卡片標題列改位置、右下角細條拖動改大小、右上 ⤢ 可全螢幕展開
      </div>

      {/* Dashboard grid（拖拉 + resize） */}
      <ResponsiveGridLayout
        className="layout mt-2"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".jstock-card-handle"
        compactType="vertical"
      >
        <div key="chart">
          <DashboardCard title="股價 K 線">
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

        <div key="eps">
          <DashboardCard
            title="EPS / 估值"
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

        <div key="revenue">
          <DashboardCard title="月營收">
            <RevenueTab code={stockCode} />
          </DashboardCard>
        </div>

        <div key="institutional">
          <DashboardCard title="三大法人">
            <InstitutionalTab code={stockCode} />
          </DashboardCard>
        </div>

        <div key="margin">
          <DashboardCard title="融資融券">
            <MarginTab code={stockCode} />
          </DashboardCard>
        </div>

        <div key="etfs">
          <DashboardCard title="ETF 持倉">
            {etfs && etfs.length > 0 ? (
              <StockETFList etfs={etfs} />
            ) : (
              <EmptyState message="此股票目前未被任何 ETF 持有" />
            )}
          </DashboardCard>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
