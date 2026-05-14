import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LogicalRange,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { PriceRow, IndicatorRow } from "@/hooks/use-prices";

interface Props {
  prices: PriceRow[];
  indicators: IndicatorRow[];
  trailingEps?: number | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const FAIR_PRICE_BANDS: { multiplier: number; color: string; title: string }[] = [
  { multiplier: 15, color: "#10b981", title: "便宜 15x" },
  { multiplier: 20, color: "#f59e0b", title: "合理 20x" },
  { multiplier: 25, color: "#f43f5e", title: "偏貴 25x" },
];

const CHART_BG = "transparent";
const TEXT_COLOR = "#94a3b8";
const GRID_COLOR = "#1e293b";
const BORDER_COLOR = "#334155";

function chartOpts(
  width: number,
  height: number,
  showTimeAxis: boolean,
  crosshair: boolean
) {
  return {
    layout: {
      background: { type: ColorType.Solid as const, color: CHART_BG },
      textColor: TEXT_COLOR,
      fontSize: 11,
    },
    grid: {
      vertLines: { color: GRID_COLOR },
      horzLines: { color: GRID_COLOR },
    },
    rightPriceScale: { borderColor: BORDER_COLOR },
    timeScale: {
      borderColor: BORDER_COLOR,
      timeVisible: false,
      visible: showTimeAxis,
    },
    crosshair: { mode: crosshair ? CrosshairMode.Normal : CrosshairMode.Normal },
    width,
    height,
  };
}

export function SyncedStockChart({
  prices,
  indicators,
  trailingEps,
  onLoadMore,
  isLoadingMore,
}: Props) {
  const kRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const kChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maLineRefs = useRef<ISeriesApi<"Line">[]>([]);
  const bbLineRefs = useRef<ISeriesApi<"Line">[]>([]);
  const rsiLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiObRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiOsRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const fairPriceLinesRef = useRef<IPriceLine[]>([]);

  const isSyncing = useRef(false);
  const loadMoreCalled = useRef(false);
  const initialFit = useRef(false);

  // Effect 1: create charts + series (once)
  useEffect(() => {
    if (!kRef.current || !rsiRef.current || !macdRef.current) return;

    const w = kRef.current.clientWidth;

    const kChart = createChart(kRef.current, chartOpts(w, 400, false, true));
    const rChart = createChart(rsiRef.current, chartOpts(w, 120, false, true));
    const mChart = createChart(macdRef.current, chartOpts(w, 120, true, true));

    kChartRef.current = kChart;
    rsiChartRef.current = rChart;
    macdChartRef.current = mChart;

    // K-line series
    candleRef.current = kChart.addCandlestickSeries({
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
    });

    volRef.current = kChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    kChart
      .priceScale("volume")
      .applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // MA lines
    const maColors = ["#f59e0b", "#3b82f6", "#a855f7"];
    maLineRefs.current = maColors.map((color) =>
      kChart.addLineSeries({
        color,
        lineWidth: 1,
        crosshairMarkerVisible: false,
      })
    );

    // Bollinger bands
    bbLineRefs.current = [
      kChart.addLineSeries({
        color: "#475569",
        lineWidth: 1,
        lineStyle: 2,
        crosshairMarkerVisible: false,
      }),
      kChart.addLineSeries({
        color: "#475569",
        lineWidth: 1,
        lineStyle: 2,
        crosshairMarkerVisible: false,
      }),
    ];

    // RSI series
    rsiLineRef.current = rChart.addLineSeries({
      color: "#a855f7",
      lineWidth: 2,
    });
    rsiObRef.current = rChart.addLineSeries({
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
    });
    rsiOsRef.current = rChart.addLineSeries({
      color: "#22c55e",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
    });

    // MACD series
    histRef.current = mChart.addHistogramSeries({
      priceFormat: { type: "price", precision: 2 },
    });
    macdLineRef.current = mChart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
    });
    signalLineRef.current = mChart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
    });

    // Sync time scales
    const charts = [kChart, rChart, mChart];
    const syncRange =
      (srcIdx: number) => (range: LogicalRange | null) => {
        if (isSyncing.current || !range) return;
        isSyncing.current = true;
        charts.forEach((c, i) => {
          if (i !== srcIdx) c.timeScale().setVisibleLogicalRange(range);
        });
        isSyncing.current = false;

        if (range.from < 10 && !loadMoreCalled.current && onLoadMore) {
          loadMoreCalled.current = true;
          onLoadMore();
        }
      };

    kChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange(0));
    rChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange(1));
    mChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange(2));

    // Sync crosshair
    const syncCrosshair = (
      src: IChartApi,
      targets: IChartApi[],
      targetSeries: (() => ISeriesApi<any> | null)[]
    ) => {
      src.subscribeCrosshairMove((param) => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        targets.forEach((t, i) => {
          const s = targetSeries[i]();
          if (param.time && s) {
            t.setCrosshairPosition(NaN, param.time, s);
          } else {
            t.clearCrosshairPosition();
          }
        });
        isSyncing.current = false;
      });
    };

    syncCrosshair(kChart, [rChart, mChart], [
      () => rsiLineRef.current,
      () => macdLineRef.current,
    ]);
    syncCrosshair(rChart, [kChart, mChart], [
      () => candleRef.current,
      () => macdLineRef.current,
    ]);
    syncCrosshair(mChart, [kChart, rChart], [
      () => candleRef.current,
      () => rsiLineRef.current,
    ]);

    // Resize
    const handleResize = () => {
      [
        [kChart, kRef] as const,
        [rChart, rsiRef] as const,
        [mChart, macdRef] as const,
      ].forEach(([chart, ref]) => {
        if (ref.current)
          chart.applyOptions({ width: ref.current.clientWidth });
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      kChart.remove();
      rChart.remove();
      mChart.remove();
      kChartRef.current = null;
      rsiChartRef.current = null;
      macdChartRef.current = null;
      initialFit.current = false;
    };
  }, []);

  // Effect 2: update data
  useEffect(() => {
    if (!candleRef.current || prices.length === 0) return;

    const visibleRange = kChartRef.current?.timeScale().getVisibleRange();

    // K-line
    candleRef.current.setData(
      prices.map((p) => ({
        time: p.price_date as Time,
        open: p.open_price ?? p.close_price,
        high: p.high_price ?? p.close_price,
        low: p.low_price ?? p.close_price,
        close: p.close_price,
      }))
    );

    volRef.current?.setData(
      prices.map((p) => ({
        time: p.price_date as Time,
        value: p.volume ?? 0,
        color:
          (p.change_val ?? 0) >= 0
            ? "rgba(239,68,68,0.3)"
            : "rgba(34,197,94,0.3)",
      }))
    );

    // MA lines
    const maKeys = ["ma5", "ma20", "ma60"] as const;
    maLineRefs.current.forEach((series, idx) => {
      const key = maKeys[idx];
      series.setData(
        indicators
          .filter((d) => d[key] != null)
          .map((d) => ({ time: d.date as Time, value: d[key]! }))
      );
    });

    // Bollinger bands
    bbLineRefs.current[0]?.setData(
      indicators
        .filter((d) => d.bb_upper != null)
        .map((d) => ({ time: d.date as Time, value: d.bb_upper! }))
    );
    bbLineRefs.current[1]?.setData(
      indicators
        .filter((d) => d.bb_lower != null)
        .map((d) => ({ time: d.date as Time, value: d.bb_lower! }))
    );

    // RSI
    const rsiData = indicators.filter((d) => d.rsi != null);
    rsiLineRef.current?.setData(
      rsiData.map((d) => ({ time: d.date as Time, value: d.rsi! }))
    );
    rsiObRef.current?.setData(
      rsiData.map((d) => ({ time: d.date as Time, value: 70 }))
    );
    rsiOsRef.current?.setData(
      rsiData.map((d) => ({ time: d.date as Time, value: 30 }))
    );

    // MACD
    const macdData = indicators.filter((d) => d.macd_line != null);
    histRef.current?.setData(
      macdData
        .filter((d) => d.histogram != null)
        .map((d) => ({
          time: d.date as Time,
          value: d.histogram!,
          color:
            d.histogram! >= 0
              ? "rgba(239,68,68,0.5)"
              : "rgba(34,197,94,0.5)",
        }))
    );
    macdLineRef.current?.setData(
      macdData.map((d) => ({ time: d.date as Time, value: d.macd_line! }))
    );
    signalLineRef.current?.setData(
      macdData
        .filter((d) => d.signal_line != null)
        .map((d) => ({ time: d.date as Time, value: d.signal_line! }))
    );

    // Restore visible range or fit content on first load
    if (visibleRange && initialFit.current) {
      kChartRef.current?.timeScale().setVisibleRange(visibleRange);
    } else {
      kChartRef.current?.timeScale().fitContent();
      initialFit.current = true;
    }

    loadMoreCalled.current = false;
  }, [prices, indicators]);

  // Effect 3: fair-price horizontal lines (trailing EPS × 15/20/25)
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;

    // Clear previous lines
    fairPriceLinesRef.current.forEach((line) => {
      try {
        candle.removePriceLine(line);
      } catch {
        // chart may already be disposed
      }
    });
    fairPriceLinesRef.current = [];

    if (trailingEps == null || trailingEps <= 0) return;

    fairPriceLinesRef.current = FAIR_PRICE_BANDS.map(({ multiplier, color, title }) =>
      candle.createPriceLine({
        price: Number((trailingEps * multiplier).toFixed(2)),
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title,
      })
    );
  }, [trailingEps]);

  return (
    <div className="relative">
      {isLoadingMore && (
        <div className="absolute left-2 top-2 z-10 rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-300">
          載入更多資料中…
        </div>
      )}
      {/* K-line */}
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
          <span
            className="inline-block h-0.5 w-3 bg-slate-500"
            style={{ borderTop: "1px dashed" }}
          />{" "}
          BB
        </span>
        {trailingEps != null && trailingEps > 0 && (
          <>
            <span className="ml-2 text-slate-600">|</span>
            <span className="text-slate-500">合理價(P/E×):</span>
            {FAIR_PRICE_BANDS.map(({ multiplier, color }) => (
              <span key={multiplier} className="flex items-center gap-1">
                <span
                  className="inline-block h-0.5 w-3"
                  style={{ backgroundColor: color }}
                />
                <span className="tabular-nums">
                  {multiplier}× {(trailingEps * multiplier).toFixed(0)}
                </span>
              </span>
            ))}
          </>
        )}
      </div>
      <div ref={kRef} className="w-full" />

      {/* RSI */}
      <div className="mt-1 mb-1 text-xs text-slate-500">RSI (14)</div>
      <div ref={rsiRef} className="w-full" />

      {/* MACD */}
      <div className="mt-1 mb-1 text-xs text-slate-500">MACD (12, 26, 9)</div>
      <div ref={macdRef} className="w-full" />
    </div>
  );
}
