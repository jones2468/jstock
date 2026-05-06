import { useEffect, useRef } from "react";
import { createChart, type IChartApi, ColorType } from "lightweight-charts";
import type { IndicatorRow } from "@/hooks/use-prices";

interface Props {
  indicators: IndicatorRow[];
  height?: number;
}

export function RSIChart({ indicators, height = 120 }: Props) {
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

    const rsiSeries = chart.addLineSeries({
      color: "#a855f7",
      lineWidth: 1.5,
    });
    rsiSeries.setData(
      indicators
        .filter((d) => d.rsi != null)
        .map((d) => ({ time: d.date, value: d.rsi! }))
    );

    // Overbought/oversold lines
    const ob = chart.addLineSeries({ color: "#ef4444", lineWidth: 1, lineStyle: 2, crosshairMarkerVisible: false });
    const os = chart.addLineSeries({ color: "#22c55e", lineWidth: 1, lineStyle: 2, crosshairMarkerVisible: false });
    const rsiData = indicators.filter((d) => d.rsi != null);
    ob.setData(rsiData.map((d) => ({ time: d.date, value: 70 })));
    os.setData(rsiData.map((d) => ({ time: d.date, value: 30 })));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [indicators, height]);

  return (
    <div>
      <div className="mb-1 text-xs text-slate-500">RSI (14)</div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
