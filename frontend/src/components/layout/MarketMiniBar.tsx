import { useMarketIndices, type IndexPoint } from "@/hooks/use-market-indices";
import { useMarketTemperature, type Tone } from "@/hooks/use-market-temperature";

const INDEX_META: { code: string; label: string }[] = [
  { code: "TAIEX", label: "加權" },
  { code: "TPEX", label: "櫃買" },
  { code: "SEMI", label: "半導體" },
  { code: "FINANCE", label: "金融" },
];

const TONE_COLORS: Record<Tone, string> = {
  red: "text-rose-400",
  yellow: "text-amber-400",
  green: "text-emerald-400",
  blue: "text-sky-400",
  gray: "text-slate-500",
};

function MiniSparkline({ points }: { points: IndexPoint[] }) {
  const closes = points.map((p) => p.close).filter((v): v is number => v != null);
  if (closes.length < 2) return null;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const h = 20;
  const w = 56;
  const step = w / (closes.length - 1);

  const d = closes
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = closes[closes.length - 1] >= closes[0];

  return (
    <svg width={w} height={h} className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={up ? "#10b981" : "#ef4444"}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexChip({ code, label, points }: { code: string; label: string; points?: IndexPoint[] }) {
  const latest = points?.[points.length - 1];
  const close = latest?.close;
  const change = latest?.change;
  const pct = latest?.pct;
  const up = (change ?? 0) >= 0;

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface/50 transition-colors">
      <span className="text-[11px] text-slate-500 min-w-[28px]">{label}</span>
      {close != null ? (
        <>
          <span className="text-xs font-medium tabular-nums text-slate-200">
            {close >= 10000 ? close.toFixed(0) : close.toFixed(2)}
          </span>
          <span className={`text-[11px] tabular-nums ${up ? "text-red-400" : "text-green-400"}`}>
            {up ? "+" : ""}{pct != null ? `${pct.toFixed(2)}%` : ""}
          </span>
          {points && <MiniSparkline points={points} />}
        </>
      ) : (
        <span className="text-[11px] text-slate-600">—</span>
      )}
    </div>
  );
}

export function MarketMiniBar() {
  const { data: indices } = useMarketIndices(30);
  const { data: temp } = useMarketTemperature();

  const hasAny = indices && Object.keys(indices).length > 0;
  if (!hasAny && !temp) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface-secondary px-2 py-0.5 text-xs scrollbar-none sm:gap-2 sm:px-4">
      {INDEX_META.map(({ code, label }) => (
        <IndexChip key={code} code={code} label={label} points={indices?.[code]} />
      ))}

      {temp?.temperature && (
        <div className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1">
          <span className="text-[11px] text-slate-500">溫度</span>
          <span className={`text-xs font-medium ${TONE_COLORS[temp.temperature.tone]}`}>
            {temp.temperature.label}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">
            {temp.temperature.score}/6
          </span>
        </div>
      )}
    </div>
  );
}
