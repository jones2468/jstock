import { Search, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearch } from "@/hooks/use-search";
import { useFavorites } from "@/hooks/use-favorites";
import { useMarketIndices, type IndexPoint } from "@/hooks/use-market-indices";
import { useMarketTemperature, type Tone } from "@/hooks/use-market-temperature";

const INDEX_META = [
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
  const h = 16;
  const w = 44;
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
      <path d={d} fill="none" stroke={up ? "#10b981" : "#ef4444"} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function IndexChip({ label, points }: { label: string; points?: IndexPoint[] }) {
  const latest = points?.[points.length - 1];
  const close = latest?.close;
  const pct = latest?.pct;
  const up = (pct ?? 0) >= 0;
  return (
    <div className="flex items-center gap-1.5 px-1.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      {close != null ? (
        <>
          <span className="text-[11px] font-medium tabular-nums text-slate-300">
            {close >= 10000 ? close.toFixed(0) : close.toFixed(2)}
          </span>
          <span className={`text-[10px] tabular-nums ${up ? "text-red-400" : "text-green-400"}`}>
            {up ? "+" : ""}{pct?.toFixed(2)}%
          </span>
          {points && <MiniSparkline points={points} />}
        </>
      ) : (
        <span className="text-[11px] text-slate-600">—</span>
      )}
    </div>
  );
}

export function TopBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { toggleItem, checkItem } = useFavorites();
  const { data, isLoading } = useGlobalSearch(query);
  const { data: indices } = useMarketIndices(30);
  const { data: temp } = useMarketTemperature();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const first = data?.stocks?.[0] ?? data?.etfs?.[0];
    if (first) {
      const path = data?.stocks?.length ? `/stock/${first.code}` : `/etf/${first.code}`;
      navigate(path);
    } else {
      navigate(`/stock/${q}`);
    }
    setQuery("");
    setOpen(false);
  }

  function gotoStock(code: string) {
    navigate(`/stock/${code}`);
    setQuery("");
    setOpen(false);
  }

  function gotoEtf(code: string) {
    navigate(`/etf/${code}`);
    setQuery("");
    setOpen(false);
  }

  const hasResults = (data?.stocks?.length ?? 0) + (data?.etfs?.length ?? 0) > 0;

  return (
    <header className="flex h-10 items-center gap-2 border-b border-border bg-surface-secondary px-3">
      {/* Search */}
      <div ref={wrapRef} className="relative w-48 shrink-0">
        <form onSubmit={handleSubmit}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="搜尋股票/ETF..."
            className="w-full rounded border border-border bg-surface py-1 pl-8 pr-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-accent"
          />
        </form>

        {open && query.trim().length >= 1 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-md border border-border bg-surface-secondary shadow-lg">
            {isLoading && <div className="px-3 py-2 text-xs text-slate-500">搜尋中...</div>}
            {!isLoading && !hasResults && <div className="px-3 py-2 text-xs text-slate-500">沒有符合的結果</div>}

            {!!data?.stocks?.length && (
              <div>
                <div className="border-b border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  股票 · {data.stocks.length}
                </div>
                {data.stocks.map((s) => {
                  const fav = checkItem("stock", s.code);
                  return (
                    <div key={`s-${s.code}`} className="flex items-center justify-between border-b border-border/40 px-3 py-1.5 hover:bg-surface">
                      <button onClick={() => gotoStock(s.code)} className="flex-1 text-left">
                        <span className="text-xs"><span className="text-accent">{s.code}</span> <span className="text-slate-300">{s.name}</span></span>
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); toggleItem("stock", s.code); }}
                        className={fav ? "rounded p-0.5 text-amber-400" : "rounded p-0.5 text-slate-600 hover:text-amber-400"}
                      >
                        <Star className="h-3 w-3" fill={fav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!!data?.etfs?.length && (
              <div>
                <div className="border-b border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  ETF · {data.etfs.length}
                </div>
                {data.etfs.map((e) => {
                  const fav = checkItem("etf", e.code);
                  return (
                    <div key={`e-${e.code}`} className="flex items-center justify-between border-b border-border/40 px-3 py-1.5 hover:bg-surface">
                      <button onClick={() => gotoEtf(e.code)} className="flex-1 text-left">
                        <span className="text-xs"><span className="text-accent">{e.code}</span> <span className="text-slate-300">{e.name}</span></span>
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); toggleItem("etf", e.code); }}
                        className={fav ? "rounded p-0.5 text-amber-400" : "rounded p-0.5 text-slate-600 hover:text-amber-400"}
                      >
                        <Star className="h-3 w-3" fill={fav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Market indices */}
      <div className="hidden items-center gap-1 overflow-x-auto scrollbar-none md:flex">
        {INDEX_META.map(({ code, label }) => (
          <IndexChip key={code} label={label} points={indices?.[code]} />
        ))}
      </div>

      {/* Temperature */}
      {temp?.temperature && (
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-500">溫度</span>
          <span className={`text-xs font-medium ${TONE_COLORS[temp.temperature.tone]}`}>
            {temp.temperature.label}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">{temp.temperature.score}/6</span>
        </div>
      )}
    </header>
  );
}
