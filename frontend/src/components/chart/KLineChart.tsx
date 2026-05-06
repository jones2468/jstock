import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { PriceRow, IndicatorRow } from "@/hooks/use-prices";

interface Props {
  prices: PriceRow[];
  indicators: IndicatorRow[];
  height?: number;
}

export function KLineChart({ prices, indicators, height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

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
      height,
    });
    chartRef.current = chart;

    // Candlestick
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
    });
    candleSeries.setData(
      prices.map((p) => ({
        time: p.price_date,
        open: p.open_price ?? p.close_price,
        high: p.high_price ?? p.close_price,
        low: p.low_price ?? p.close_price,
        close: p.close_price,
      }))
    );

    // Volume
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      prices.map((p) => ({
        time: p.price_date,
        value: p.volume ?? 0,
        color: (p.change_val ?? 0) >= 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)",
      }))
    );

    // MA lines
    if (indicators.length > 0) {
      addLineSeries(chart, indicators, "ma5", "#f59e0b");
      addLineSeries(chart, indicators, "ma20", "#3b82f6");
      addLineSeries(chart, indicators, "ma60", "#a855f7");

      // Bollinger bands
      addLineSeries(chart, indicators, "bb_upper", "#475569", 1, true);
      addLineSeries(chart, indicators, "bb_lower", "#475569", 1, true);
    }

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
    };
  }, [prices, indicators, height]);

  return <div ref={containerRef} className="w-full" />;
}

function addLineSeries(
  chart: IChartApi,
  indicators: IndicatorRow[],
  key: keyof IndicatorRow,
  color: string,
  lineWidth: number = 1,
  dashed: boolean = false
) {
  const series = chart.addLineSeries({
    color,
    lineWidth,
    crosshairMarkerVisible: false,
    ...(dashed ? { lineStyle: 2 } : {}),
  });
  series.setData(
    indicators
      .filter((d) => d[key] != null)
      .map((d) => ({ time: d.date, value: d[key] as number }))
  );
}
