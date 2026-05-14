import { useMargin } from "@/hooks/use-stock-detail";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function MarginTab({ code }: { code: string }) {
  const { data, isLoading } = useMargin(code, 60);

  if (isLoading) return <LoadingSpinner />;
  if (!data?.length)
    return <EmptyState message="尚無融資融券資料（每日 16:30 後更新）" />;

  const fmt = (n: number | null | undefined) =>
    n == null ? "-" : n.toLocaleString();
  const fmtDelta = (today: number | null, yest: number | null) => {
    if (today == null || yest == null) return null;
    return today - yest;
  };
  const cls = (n: number | null | undefined) =>
    n == null ? "" : n > 0 ? "text-red-400" : n < 0 ? "text-green-400" : "";

  // 計算融資增減（今日餘額 - 前一日餘額）
  const rows = data.map((r, i) => {
    const prev = data[i + 1]; // 較舊的
    return {
      ...r,
      margin_delta: fmtDelta(r.margin_balance, prev?.margin_balance ?? null),
      short_delta: fmtDelta(r.short_balance, prev?.short_balance ?? null),
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-slate-500">
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-right">融資餘額</th>
            <th className="px-2 py-2 text-right">融資增減</th>
            <th className="px-2 py-2 text-right border-l border-border">融券餘額</th>
            <th className="px-2 py-2 text-right">融券增減</th>
            <th className="px-2 py-2 text-right border-l border-border">融資使用率</th>
            <th className="px-2 py-2 text-right">資券比</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ratio =
              r.margin_balance && r.margin_balance > 0 && r.short_balance != null
                ? ((r.short_balance / r.margin_balance) * 100).toFixed(2)
                : null;
            const utilization =
              r.margin_balance != null && r.margin_limit && r.margin_limit > 0
                ? ((r.margin_balance / r.margin_limit) * 100).toFixed(1)
                : null;
            const utilCls =
              utilization != null
                ? parseFloat(utilization) > 80
                  ? "text-rose-400"
                  : parseFloat(utilization) > 60
                    ? "text-amber-400"
                    : "text-slate-300"
                : "";
            return (
              <tr key={r.trade_date} className="border-b border-border/40">
                <td className="px-2 py-1.5 text-left text-slate-400">
                  {r.trade_date}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {fmt(r.margin_balance)}
                </td>
                <td className={`px-2 py-1.5 text-right ${cls(r.margin_delta)}`}>
                  {r.margin_delta == null
                    ? "-"
                    : (r.margin_delta >= 0 ? "+" : "") +
                      r.margin_delta.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right border-l border-border">
                  {fmt(r.short_balance)}
                </td>
                <td className={`px-2 py-1.5 text-right ${cls(r.short_delta)}`}>
                  {r.short_delta == null
                    ? "-"
                    : (r.short_delta >= 0 ? "+" : "") +
                      r.short_delta.toLocaleString()}
                </td>
                <td className={`px-2 py-1.5 text-right border-l border-border ${utilCls}`}>
                  {utilization ? `${utilization}%` : "-"}
                </td>
                <td className="px-2 py-1.5 text-right text-slate-300">
                  {ratio ? `${ratio}%` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-slate-500">
        單位：張。融資使用率 = 餘額 / 限額（高於 80% 代表融資額度吃緊）。資券比 = 融券餘額 / 融資餘額（高於 30% 通常代表軋空可能）。
      </div>
    </div>
  );
}
