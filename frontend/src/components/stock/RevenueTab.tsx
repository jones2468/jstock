import { useRevenue } from "@/hooks/use-stock-detail";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function RevenueTab({ code }: { code: string }) {
  const { data, isLoading } = useRevenue(code, 24);

  if (isLoading) return <LoadingSpinner />;
  if (!data?.length)
    return <EmptyState message="尚無月營收資料（每月 11 號後更新）" />;

  const fmt = (n: number | null | undefined) =>
    n == null ? "-" : (n / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const pctCls = (n: number | null | undefined) =>
    n == null ? "" : n > 0 ? "text-red-400" : n < 0 ? "text-green-400" : "";
  const pct = (n: number | null | undefined) =>
    n == null ? "-" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  // 找最大營收作為 sparkline 比例
  const maxRevenue = Math.max(...data.map((r) => r.revenue ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-slate-500">
            <th className="px-2 py-2 text-left">年月</th>
            <th className="px-2 py-2 text-right">營收（百萬）</th>
            <th className="px-2 py-2 text-right">YoY</th>
            <th className="px-2 py-2 text-right">MoM</th>
            <th className="px-2 py-2 text-right border-l border-border">累計（百萬）</th>
            <th className="px-2 py-2 text-right">累計 YoY</th>
            <th className="px-2 py-2 w-32">趨勢</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const widthPct = r.revenue && maxRevenue
              ? Math.max(2, (r.revenue / maxRevenue) * 100)
              : 0;
            return (
              <tr
                key={`${r.report_year}-${r.report_month}`}
                className="border-b border-border/40"
              >
                <td className="px-2 py-1.5 text-left text-slate-400">
                  {r.report_year}/{String(r.report_month).padStart(2, "0")}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {fmt(r.revenue)}
                </td>
                <td className={`px-2 py-1.5 text-right ${pctCls(r.yoy_pct)}`}>
                  {pct(r.yoy_pct)}
                </td>
                <td className={`px-2 py-1.5 text-right ${pctCls(r.mom_pct)}`}>
                  {pct(r.mom_pct)}
                </td>
                <td className="px-2 py-1.5 text-right border-l border-border">
                  {fmt(r.ytd_revenue)}
                </td>
                <td className={`px-2 py-1.5 text-right ${pctCls(r.ytd_yoy_pct)}`}>
                  {pct(r.ytd_yoy_pct)}
                </td>
                <td className="px-2 py-1.5">
                  <div className="h-2 w-full rounded bg-surface">
                    <div
                      className="h-2 rounded bg-accent"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-slate-500">
        單位：百萬元。紅 = YoY/MoM 成長、綠 = 衰退。
      </div>
    </div>
  );
}
