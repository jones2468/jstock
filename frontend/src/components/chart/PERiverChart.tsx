import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import { usePrices } from "@/hooks/use-prices";
import { useQuarterlyEPS, useValuation } from "@/hooks/use-stock-detail";
import {
  buildMonthlySamples,
  classifyPE,
  percentileRank,
} from "@/lib/valuation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  code: string;
}

const PE_BANDS: { multiplier: number; color: string }[] = [
  { multiplier: 10, color: "#0ea5e9" }, // 深藍
  { multiplier: 15, color: "#10b981" }, // 綠
  { multiplier: 20, color: "#f59e0b" }, // 黃
  { multiplier: 25, color: "#f97316" }, // 橘
  { multiplier: 30, color: "#f43f5e" }, // 紅
];

function threeYearRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function PERiverChart({ code }: Props) {
  const { start, end } = useMemo(threeYearRange, []);
  const { data: prices, isLoading: pricesLoading } = usePrices(code, start, end);
  const { data: epsRows, isLoading: epsLoading } = useQuarterlyEPS(code, 16);
  const { data: valuation } = useValuation(code);

  const samples = useMemo(() => {
    if (!prices || !epsRows) return [];
    return buildMonthlySamples(prices, epsRows);
  }, [prices, epsRows]);

  const stats = useMemo(() => {
    const peSeries = samples.map((s) => s.pe).filter((v): v is number => v != null);
    if (peSeries.length === 0 || valuation?.trailing_pe == null) return null;
    const sorted = [...peSeries].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const pct = percentileRank(peSeries, valuation.trailing_pe);
    return {
      median,
      min,
      max,
      current: valuation.trailing_pe,
      percentile: pct,
      classification: pct != null ? classifyPE(pct) : null,
    };
  }, [samples, valuation]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || samples.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 420,
    });
    chartRef.current = chart;

    // PE band lines
    for (const { multiplier, color } of PE_BANDS) {
      const series = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        title: `${multiplier}×`,
      });
      series.setData(
        samples
          .filter((s) => s.trailingEps != null && s.trailingEps > 0)
          .map((s) => ({
            time: s.date as Time,
            value: Number((s.trailingEps! * multiplier).toFixed(2)),
          }))
      );
    }

    // Actual monthly price
    const priceSeries: ISeriesApi<"Line"> = chart.addLineSeries({
      color: "#e2e8f0",
      lineWidth: 3,
      crosshairMarkerVisible: true,
      title: "月收盤",
    });
    priceSeries.setData(
      samples.map((s) => ({ time: s.date as Time, value: s.close }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [samples]);

  if (pricesLoading || epsLoading) return <LoadingSpinner />;
  if (!epsRows || epsRows.length < 4) {
    return <EmptyState message="此股票尚無足夠的歷史 EPS 資料（需至少 4 季）" />;
  }
  if (samples.length === 0) {
    return <EmptyState message="尚無股價資料" />;
  }

  return (
    <div className="space-y-3">
      {/* Header with percentile widget */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="目前 P/E" value={stats.current.toFixed(1)} tone="neutral" />
          <Stat
            label="3 年中位數"
            value={stats.median.toFixed(1)}
            tone="neutral"
          />
          <Stat
            label="3 年區間"
            value={`${stats.min.toFixed(1)} ~ ${stats.max.toFixed(1)}`}
            tone="neutral"
          />
          <Stat
            label="分位數"
            value={
              stats.percentile != null
                ? `${stats.percentile.toFixed(0)}% · ${stats.classification?.label ?? ""}`
                : "—"
            }
            tone={
              stats.classification?.tone === "low"
                ? "low"
                : stats.classification?.tone === "high"
                  ? "high"
                  : "mid"
            }
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>本益比河流圖</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-slate-200" /> 月收盤
        </span>
        {PE_BANDS.map(({ multiplier, color }) => (
          <span key={multiplier} className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-3"
              style={{ backgroundColor: color, borderTop: "1px dotted" }}
            />{" "}
            {multiplier}× EPS
          </span>
        ))}
      </div>

      <div ref={containerRef} className="w-full" />

      <p className="text-xs leading-relaxed text-slate-500">
        每條虛線 = 各月份「過去 4 季 EPS 合計 × 倍數」對應的股價。
        白線位於越下方的色帶 = 相對歷史越便宜。EPS 採報後 45 天延遲假設（避免未來資訊偏誤）。
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "low" | "mid" | "high" | "neutral";
}) {
  const toneClass =
    tone === "low"
      ? "text-emerald-400"
      : tone === "high"
        ? "text-rose-400"
        : tone === "mid"
          ? "text-amber-400"
          : "text-slate-200";
  return (
    <div className="rounded-md border border-border bg-surface-secondary p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
