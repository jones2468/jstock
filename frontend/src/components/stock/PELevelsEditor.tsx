import { useEffect, useState } from "react";
import { Settings2, RotateCcw, Check } from "lucide-react";
import { usePELevels } from "@/hooks/use-pe-levels";

// 個股頁本益比門檻自設 UI（折疊式，預設收合）
export function PELevelsEditor({ code }: { code: string }) {
  const { levels, isCustom, save, reset, defaults } = usePELevels(code);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(levels);

  // 切股票或外部變動時同步
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
    <div className="mb-3 rounded-md border border-border bg-surface-secondary/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-400 hover:text-slate-200"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>本益比門檻</span>
        <span className="text-slate-600">
          便宜 &lt; {levels.cheap} · 合理 ~ {levels.fair} · 偏貴 &gt; {levels.expensive}
        </span>
        {isCustom && (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
            自訂
          </span>
        )}
        <span className="ml-auto text-slate-600">{open ? "收合" : "展開"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          <p className="text-xs leading-relaxed text-slate-500">
            每個產業的合理本益比不同，可依個股調整。
            <span className="text-green-400">便宜</span>（綠）：P/E &lt; 便宜值；
            <span className="text-amber-400">合理</span>（黃）：便宜 ~ 偏貴之間；
            <span className="text-rose-400">偏貴</span>（紅）：P/E &gt; 偏貴值。
            合理價試算會使用此三檔倍數。
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
            <p className="text-xs text-rose-400">
              請確認：便宜 &lt; 合理 &lt; 偏貴，且皆為正數
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
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
              回到預設
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
      )}
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
