import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChangeLabel } from "@/components/ui/ChangeLabel";
import { Sparkline } from "@/components/ui/Sparkline";
import type { HoldingRow, DiffRow } from "@/hooks/use-holdings";

type SortKey = "weight" | "change" | "code";
type FilterType = "all" | "new" | "removed" | "increased" | "decreased";

interface Props {
  holdings: HoldingRow[];
  diffs: DiffRow[];
}

export function HoldingsTable({ holdings, diffs }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [filter, setFilter] = useState<FilterType>("all");

  const diffMap = useMemo(() => {
    const m = new Map<string, DiffRow>();
    for (const d of diffs) m.set(d.stock_code, d);
    return m;
  }, [diffs]);

  const merged = useMemo(() => {
    let rows = holdings.map((h) => {
      const diff = diffMap.get(h.stock_code);
      return { ...h, diff };
    });

    // Include removed stocks (not in today's holdings)
    for (const d of diffs) {
      if (d.diff_type === "removed" && !holdings.find((h) => h.stock_code === d.stock_code)) {
        rows.push({
          stock_code: d.stock_code,
          stock_name: d.stock_name,
          weight_pct: 0,
          shares: null,
          diff: d,
        });
      }
    }

    if (filter !== "all") {
      rows = rows.filter((r) => r.diff?.diff_type === filter);
    }

    rows.sort((a, b) => {
      switch (sortKey) {
        case "weight":
          return b.weight_pct - a.weight_pct;
        case "change":
          return Math.abs(b.diff?.weight_change ?? 0) - Math.abs(a.diff?.weight_change ?? 0);
        case "code":
          return a.stock_code.localeCompare(b.stock_code);
      }
    });

    return rows;
  }, [holdings, diffs, diffMap, sortKey, filter]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">篩選：</span>
        {(["all", "new", "removed", "increased", "decreased"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-surface text-slate-400 hover:text-slate-200"
            }`}
          >
            {f === "all" ? "全部" : f === "new" ? "新增" : f === "removed" ? "移除" : f === "increased" ? "加碼" : "減碼"}
          </button>
        ))}

        <span className="ml-auto text-xs text-slate-500">排序：</span>
        {(["weight", "change", "code"] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSortKey(s)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              sortKey === s
                ? "bg-accent text-white"
                : "bg-surface text-slate-400 hover:text-slate-200"
            }`}
          >
            {s === "weight" ? "權重" : s === "change" ? "變動" : "代碼"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-slate-500">
              <th className="pb-2 pr-4">股票</th>
              <th className="pb-2 pr-4 text-right">今日權重</th>
              <th className="pb-2 pr-4 text-right">昨日權重</th>
              <th className="pb-2 pr-4 text-right">變動</th>
              <th className="pb-2 pr-4">狀態</th>
              <th className="pb-2">趨勢</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((row) => (
              <tr
                key={row.stock_code}
                className="border-b border-border/50 hover:bg-surface-secondary/50"
              >
                <td className="py-2 pr-4">
                  <Link
                    to={`/stock/${row.stock_code}`}
                    className="text-accent hover:underline"
                  >
                    {row.stock_name}
                  </Link>
                  <span className="ml-1 text-xs text-slate-500">{row.stock_code}</span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.weight_pct > 0 ? `${row.weight_pct.toFixed(2)}%` : "-"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-400">
                  {row.diff?.prev_weight != null ? `${row.diff.prev_weight.toFixed(2)}%` : "-"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.diff?.weight_change != null ? (
                    <span className={row.diff.weight_change > 0 ? "text-emerald-400" : "text-red-400"}>
                      {row.diff.weight_change > 0 ? "+" : ""}
                      {row.diff.weight_change.toFixed(2)}%
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2 pr-4">
                  {row.diff && (
                    <ChangeLabel type={row.diff.diff_type} compact />
                  )}
                </td>
                <td className="py-2">
                  {row.diff?.weight_change != null && row.diff.prev_weight != null ? (
                    <Sparkline
                      data={generateMockSparkline(row.diff.prev_weight, row.weight_pct)}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        共 {merged.length} 檔
      </div>
    </div>
  );
}

function generateMockSparkline(prev: number, today: number): number[] {
  const mid = (prev + today) / 2;
  const jitter = Math.abs(today - prev) * 0.3;
  return [
    prev,
    prev + (mid - prev) * 0.3 + (Math.random() - 0.5) * jitter,
    mid + (Math.random() - 0.5) * jitter,
    today - (today - mid) * 0.3 + (Math.random() - 0.5) * jitter,
    today,
  ];
}
