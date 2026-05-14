import { useEffect, useRef } from "react";
import { Thermometer } from "lucide-react";
import {
  createChart,
  type IChartApi,
  type Time,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import {
  useMarketTemperature,
  type Tone,
  type MarketTemperatureData,
} from "@/hooks/use-market-temperature";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

const TONE_BG: Record<Tone, string> = {
  red: "bg-rose-500/15 border-rose-500/40",
  yellow: "bg-amber-400/15 border-amber-400/40",
  green: "bg-emerald-500/15 border-emerald-500/40",
  blue: "bg-sky-500/15 border-sky-500/40",
  gray: "bg-slate-700/20 border-slate-600/40",
};
const TONE_TEXT: Record<Tone, string> = {
  red: "text-rose-400",
  yellow: "text-amber-400",
  green: "text-emerald-400",
  blue: "text-sky-400",
  gray: "text-slate-400",
};
const TONE_BAR: Record<Tone, string> = {
  red: "bg-rose-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  gray: "bg-slate-600",
};

export function MarketTempPage() {
  const { data, isLoading } = useMarketTemperature();

  if (isLoading) return <LoadingSpinner />;
  if (!data) {
    return (
      <EmptyState message="尚無大盤資料（cron 還沒跑或 backfill 未完成）" />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Thermometer className="h-5 w-5 text-rose-400" />
        <h1 className="text-xl font-bold">大盤溫度計</h1>
        <span className="ml-auto text-xs text-slate-500">
          資料日期 {data.latest_date}
        </span>
      </div>

      {/* TAIEX header */}
      <div className="mb-6 rounded-lg border border-border bg-surface-secondary p-5">
        <div className="flex items-baseline gap-4">
          <span className="text-sm text-slate-400">加權指數</span>
          <span className="text-3xl font-bold tabular-nums">
            {data.taiex_close?.toLocaleString() ?? "—"}
          </span>
          {data.taiex_change != null && (
            <span
              className={`text-base font-medium tabular-nums ${
                data.taiex_change >= 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              {data.taiex_change >= 0 ? "+" : ""}
              {data.taiex_change.toFixed(2)}
              {data.taiex_change_pct != null &&
                ` (${data.taiex_change_pct >= 0 ? "+" : ""}${data.taiex_change_pct.toFixed(2)}%)`}
            </span>
          )}
        </div>
      </div>

      {/* Thermometer + 3 metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <ThermometerCard temp={data.temperature} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            title="量能"
            subtitle="5 日均量 vs 60 日"
            tone={data.volume.signal}
            ratio={data.volume.ratio}
            current={data.volume.current}
            avg={data.volume.avg60}
            unit="億"
            interpret={interpretVolume(data.volume.signal)}
          />
          <MetricCard
            title="融資餘額"
            subtitle="當前 vs 60 日均"
            tone={data.margin.signal}
            ratio={data.margin.ratio}
            current={data.margin.current}
            avg={data.margin.avg60}
            unit="億"
            interpret={interpretMargin(data.margin.signal)}
          />
          <MetricCard
            title="指數 RSI(14)"
            subtitle="0–100，超買 70 / 超賣 30"
            tone={data.rsi.signal}
            ratio={null}
            current={data.rsi.value}
            avg={null}
            unit=""
            interpret={interpretRSI(data.rsi.value, data.rsi.signal)}
          />
        </div>
      </div>

      {/* M1B */}
      {data.m1b && (
        <div className="mb-6">
          <M1BCard m1b={data.m1b} />
        </div>
      )}

      {/* History chart */}
      <div className="rounded-lg border border-border bg-surface-secondary p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          近 90 日加權指數 + 成交量
        </h2>
        <TaiexChart history={data.history} />
      </div>
    </div>
  );
}

function ThermometerCard({ temp }: { temp: MarketTemperatureData["temperature"] }) {
  // score 0-6
  const pct = (temp.score / 6) * 100;
  return (
    <div className={`rounded-lg border p-5 ${TONE_BG[temp.tone]}`}>
      <div className="text-xs text-slate-400">綜合溫度</div>
      <div className={`mt-1 text-4xl font-bold ${TONE_TEXT[temp.tone]}`}>
        {temp.label}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {temp.score} / 6 分
      </div>
      {/* horizontal bar */}
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-all ${TONE_BAR[temp.tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>冷清</span>
        <span>中性</span>
        <span>過熱</span>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  tone,
  ratio,
  current,
  avg,
  unit,
  interpret,
}: {
  title: string;
  subtitle: string;
  tone: Tone;
  ratio: number | null;
  current: number | null;
  avg: number | null;
  unit: string;
  interpret: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${TONE_BG[tone]}`}>
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${TONE_TEXT[tone]}`}>
        {ratio != null ? `${ratio.toFixed(2)}×` : current?.toFixed(1) ?? "—"}
      </div>
      <div className="mt-1 text-xs text-slate-400 tabular-nums">
        {current != null ? `${current.toFixed(0)}${unit}` : "—"}
        {avg != null && ` / 均 ${avg.toFixed(0)}${unit}`}
      </div>
      <div className={`mt-2 text-xs ${TONE_TEXT[tone]}`}>{interpret}</div>
    </div>
  );
}

function interpretVolume(t: Tone): string {
  if (t === "red") return "量能過熱，注意追高風險";
  if (t === "blue") return "量能冷清，市場觀望";
  return "量能正常";
}

function interpretMargin(t: Tone): string {
  if (t === "red") return "融資過熱，槓桿擴張";
  if (t === "blue") return "融資退場，散戶悲觀";
  return "融資水位正常";
}

function interpretRSI(value: number | null, t: Tone): string {
  if (value == null) return "—";
  if (t === "red") return "超買，留意修正";
  if (value < 30) return "超賣，留意反彈";
  return "正常區間";
}

function M1BCard({ m1b }: { m1b: NonNullable<MarketTemperatureData["m1b"]> }) {
  const yoyTone: Tone =
    m1b.m1b_yoy_pct == null
      ? "gray"
      : m1b.m1b_yoy_pct > 10
        ? "red"
        : m1b.m1b_yoy_pct < 3
          ? "blue"
          : "green";

  const interpret =
    m1b.m1b_yoy_pct == null
      ? "—"
      : m1b.m1b_yoy_pct > 10
        ? "資金寬鬆，留意過熱"
        : m1b.m1b_yoy_pct < 3
          ? "資金緊縮，市場保守"
          : "資金正常";

  const fmtBillion = (v: number | null) =>
    v == null ? "—" : `${(v / 1000).toFixed(0)} 兆`;

  return (
    <div className={`rounded-lg border p-3 ${TONE_BG[yoyTone]}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs text-slate-400">M1B 年增率（月頻）</div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {m1b.report_date.slice(0, 7)} 央行公佈
          </div>
        </div>
        <div className={`text-2xl font-bold tabular-nums ${TONE_TEXT[yoyTone]}`}>
          {m1b.m1b_yoy_pct != null ? `${m1b.m1b_yoy_pct.toFixed(2)}%` : "—"}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-400 tabular-nums">
        <span>M1B {fmtBillion(m1b.m1b)}</span>
        <span>M2 {fmtBillion(m1b.m2)}</span>
      </div>
      <div className={`mt-2 text-xs ${TONE_TEXT[yoyTone]}`}>{interpret}</div>
    </div>
  );
}

function TaiexChart({ history }: { history: MarketTemperatureData["history"] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || history.length === 0) return;

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
      height: 340,
    });

    // history is desc — flip to asc
    const asc = [...history].reverse();

    const taiexSeries = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      title: "TAIEX",
    });
    taiexSeries.setData(
      asc
        .filter((r) => r.taiex_close != null)
        .map((r) => ({
          time: r.trade_date as Time,
          value: r.taiex_close as number,
        }))
    );

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#3b82f680",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });
    volSeries.setData(
      asc
        .filter((r) => r.total_volume_value != null)
        .map((r) => ({
          time: r.trade_date as Time,
          value: r.total_volume_value as number,
          color:
            (r.taiex_change ?? 0) >= 0
              ? "rgba(239,68,68,0.5)"
              : "rgba(34,197,94,0.5)",
        }))
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
    };
  }, [history]);

  return <div ref={containerRef} className="w-full" />;
}
