import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useValuation } from "@/hooks/use-stock-detail";

interface Props {
  code: string;
  trailingEps: number | null;
}

interface Scenario {
  label: string;
  pe: number;
  color: string;
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { label: "保守", pe: 12, color: "text-green-400" },
  { label: "合理", pe: 18, color: "text-blue-400" },
  { label: "樂觀", pe: 25, color: "text-amber-400" },
];

export function TargetPriceCalculator({ code, trailingEps }: Props) {
  const { data: valuation } = useValuation(code);
  const [expanded, setExpanded] = useState(false);
  const [epsInput, setEpsInput] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);

  // 使用者輸入的 EPS 或近四季
  const eps = epsInput ? parseFloat(epsInput) : trailingEps;
  const currentPrice = valuation?.current_price ?? null;

  const handlePeChange = (idx: number, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    setScenarios((prev) => prev.map((s, i) => (i === idx ? { ...s, pe: n } : s)));
  };

  if (trailingEps == null && !epsInput) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calculator className="h-4 w-4" />
          <span>目標價試算</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          尚無足夠 EPS 資料。可手動輸入預估 EPS 來試算：
        </p>
        <input
          type="number"
          step="0.01"
          placeholder="輸入預估 EPS"
          value={epsInput}
          onChange={(e) => setEpsInput(e.target.value)}
          className="mt-2 w-40 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calculator className="h-4 w-4 text-accent" />
          <span className="font-medium text-white">目標價試算</span>
          {eps != null && (
            <span className="text-xs text-slate-500">
              EPS {eps.toFixed(2)} 元
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* Scenario cards — always visible */}
      {eps != null && eps > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {scenarios.map((s, idx) => {
            const target = Math.round(eps * s.pe);
            const upside =
              currentPrice && currentPrice > 0
                ? ((target - currentPrice) / currentPrice) * 100
                : null;

            return (
              <div
                key={s.label}
                className="rounded-md bg-surface-secondary p-3 text-center"
              >
                <div className={`text-[11px] ${s.color}`}>{s.label}</div>
                <div className="mt-0.5 text-base font-bold text-white">
                  {target.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  {s.pe} 倍 P/E
                </div>
                {upside != null && (
                  <div
                    className={`mt-1 text-[11px] font-medium ${upside >= 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {upside >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(upside).toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded: editable inputs */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500 w-24">預估 EPS</label>
            <input
              type="number"
              step="0.01"
              placeholder={trailingEps?.toFixed(2) ?? ""}
              value={epsInput}
              onChange={(e) => setEpsInput(e.target.value)}
              className="w-32 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
            />
            {epsInput && (
              <button
                onClick={() => setEpsInput("")}
                className="text-xs text-slate-500 hover:text-white"
              >
                重置
              </button>
            )}
          </div>

          {scenarios.map((s, idx) => (
            <div key={s.label} className="flex items-center gap-3">
              <label className={`text-xs w-24 ${s.color}`}>{s.label} P/E</label>
              <input
                type="number"
                step="0.5"
                value={s.pe}
                onChange={(e) => handlePeChange(idx, e.target.value)}
                className="w-32 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
              />
              <span className="text-xs text-slate-500">倍</span>
            </div>
          ))}

          <button
            onClick={() => setScenarios(DEFAULT_SCENARIOS)}
            className="text-xs text-slate-500 hover:text-accent"
          >
            恢復預設倍數
          </button>
        </div>
      )}
    </div>
  );
}
