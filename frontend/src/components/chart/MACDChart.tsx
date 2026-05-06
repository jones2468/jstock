import { useEffect, useRef } from "react";
import { createChart, type IChartApi, ColorType } from "lightweight-charts";
import type { IndicatorRow } from "@/hooks/use-prices";

interface Props {
  indicators: IndicatorRow[];
  height?: number;
}

export function MACDChart({ indicators, height = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || indicators.length === 0) return;

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
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: false },
      width: containerRef.current.clientWidth,
      height,
    });

    const macdData = indicators.filter((d) => d.macd_line != null);

    // Histogram
    const histSeries = chart.addHistogramSeries({
      priceFormat: { type: "price", precision: 2 },
    });
    histSeries.setData(
      macdData
        .filter((d) => d.histogram != null)
        .map((d) => ({
          time: d.date,
          value: d.histogram!,
          color: d.histogram! >= 0 ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)",
        }))
    );

    // MACD line
    const macdSeries = chart.addLineSeries({ color: "#3b82f6", lineWidth: 2 });
    macdSeries.setData(
      macdData.map((d) => ({ time: d.date, value: d.macd_line! }))
    );

    // Signal line
    const signalSeries = chart.addLineSeries({ color: "#f59e0b", lineWidth: 2 });
    signalSeries.setData(
      macdData
        .filter((d) => d.signal_line != null)
        .map((d) => ({ time: d.date, value: d.signal_line! }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [indicators, height]);

  return (
    <div>
      <div className="mb-1 text-xs text-slate-500">MACD (12, 26, 9)</div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
