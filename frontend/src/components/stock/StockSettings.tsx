import { useEffect, useRef, useState } from "react";
import { Settings, Check, RotateCcw } from "lucide-react";
import { usePELevels } from "@/hooks/use-pe-levels";

// 個股頁右上設定齒輪 popup
// 目前內容：本益比門檻自設。未來可加入其他個股級設定。
export function StockSettings({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-md p-2 transition-colors ${
          open
            ? "bg-accent/10 text-accent"
            : "bg-surface-secondary text-slate-500 hover:text-slate-300"
        }`}
        title="個股設定"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-lg border border-border bg-surface-secondary p-4 shadow-xl">
          <PELevelsBlock code={code} />
        </div>
      )}
    </div>
  );
}

function PELevelsBlock({ code }: { code: string }) {
  const { levels, isCustom, save, reset, defaults } = usePELevels(code);
  const [draft, setDraft] = useState(levels);

  useEffect(() => {
    setDraft(levels);
  }, [levels]);

  const dirty =
    draft.cheap !== levels.cheap ||
    draft.fair !== levels.fair ||
    draft.expensive !== levels.expensive;

  const valid =
    draft.cheap > 0 &&
    draft.fair > draft.cheap &&
    draft.expensive > draft.fair;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-200">本益比門檻</span>
        {isCustom && (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
            自訂
          </span>
        )}
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        每個產業合理本益比不同。設定影響觀察清單訊號燈與合理價估算。
      </p>

      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="便宜 (＜)"
          value={draft.cheap}
          onChange={(v) => setDraft({ ...draft, cheap: v })}
          tone="green"
        />
        <NumberField
          label="合理（中軸）"
          value={draft.fair}
          onChange={(v) => setDraft({ ...draft, fair: v })}
          tone="yellow"
        />
        <NumberField
          label="偏貴 (＞)"
          value={draft.expensive}
          onChange={(v) => setDraft({ ...draft, expensive: v })}
          tone="red"
        />
      </div>

      {!valid && (
        <p className="mt-2 text-xs text-rose-400">
          請確認：便宜 &lt; 合理 &lt; 偏貴
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            reset();
            setDraft(defaults);
          }}
          disabled={!isCustom}
          className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={`回到預設 ${defaults.cheap}/${defaults.fair}/${defaults.expensive}`}
        >
          <RotateCcw className="h-3 w-3" />
          預設
        </button>
        <button
          onClick={() => save(draft)}
          disabled={!dirty || !valid}
          className="flex items-center gap-1 rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3 w-3" />
          儲存
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone: "green" | "yellow" | "red";
}) {
  const ring =
    tone === "green"
      ? "focus:ring-emerald-500/40"
      : tone === "yellow"
        ? "focus:ring-amber-500/40"
        : "focus:ring-rose-500/40";

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full rounded border border-border bg-surface px-2 py-1.5 text-sm tabular-nums text-white outline-none focus:ring-2 ${ring}`}
      />
    </label>
  );
}
