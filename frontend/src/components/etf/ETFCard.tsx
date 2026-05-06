import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Plus, Minus } from "lucide-react";
import { useETFDiffSummary, type ETFRow } from "@/hooks/use-etfs";

interface Props {
  etf: ETFRow;
}

export function ETFCard({ etf }: Props) {
  const { data: summary } = useETFDiffSummary(etf.etf_code);

  const hasChanges = summary && (summary.new + summary.removed + summary.increased + summary.decreased) > 0;

  return (
    <Link
      to={`/etf/${etf.etf_code}`}
      className="block rounded-lg border border-border bg-surface-secondary p-4 transition-colors hover:border-accent/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-200">{etf.etf_name}</div>
          <div className="mt-0.5 text-xs text-slate-500">{etf.etf_code} / {etf.issuer}</div>
        </div>
        <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">
          {etf.group_tag === "tw" ? "台股" : "海外"}
        </span>
      </div>

      {summary && hasChanges ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.new > 0 && (
            <Badge icon={Plus} color="emerald" label="新增" count={summary.new} />
          )}
          {summary.removed > 0 && (
            <Badge icon={Minus} color="red" label="移除" count={summary.removed} />
          )}
          {summary.increased > 0 && (
            <Badge icon={TrendingUp} color="emerald" label="加碼" count={summary.increased} />
          )}
          {summary.decreased > 0 && (
            <Badge icon={TrendingDown} color="amber" label="減碼" count={summary.decreased} />
          )}
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-600">今日無異動</div>
      )}
    </Link>
  );
}

function Badge({
  icon: Icon,
  color,
  label,
  count,
}: {
  icon: typeof Plus;
  color: string;
  label: string;
  count: number;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-400/10",
    red: "text-red-400 bg-red-400/10",
    amber: "text-amber-400 bg-amber-400/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${colorMap[color]}`}>
      <Icon className="h-3 w-3" />
      {label} {count}
    </span>
  );
}
