import { TrendingUp, TrendingDown, Plus, Minus } from "lucide-react";

type DiffType = "new" | "removed" | "increased" | "decreased";

const config: Record<DiffType, { label: string; color: string; Icon: typeof TrendingUp }> = {
  new: { label: "新增", color: "text-emerald-400 bg-emerald-400/10", Icon: Plus },
  removed: { label: "移除", color: "text-red-400 bg-red-400/10", Icon: Minus },
  increased: { label: "加碼", color: "text-emerald-400 bg-emerald-400/10", Icon: TrendingUp },
  decreased: { label: "減碼", color: "text-amber-400 bg-amber-400/10", Icon: TrendingDown },
};

interface Props {
  type: DiffType;
  value?: number | null;
  compact?: boolean;
}

export function ChangeLabel({ type, value, compact }: Props) {
  const c = config[type];
  if (!c) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${c.color}`}>
      <c.Icon className="h-3 w-3" />
      {compact ? null : c.label}
      {value != null && <span>{value > 0 ? "+" : ""}{value.toFixed(2)}%</span>}
    </span>
  );
}
