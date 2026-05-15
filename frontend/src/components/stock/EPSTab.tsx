import { useQuarterlyEPS, type EPSRow } from "@/hooks/use-stock-detail";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TargetPriceCalculator } from "./TargetPriceCalculator";

export function EPSTab({ code }: { code: string }) {
  const { data, isLoading } = useQuarterlyEPS(code, 16);

  if (isLoading) return <LoadingSpinner />;
  if (!data?.length) return <EmptyState message="尚無季 EPS 資料" />;

  // 計算近四季合計 EPS
  const last4 = data.slice(0, 4);
  const trailing4Q =
    last4.length === 4 && last4.every((r) => r.eps != null)
      ? last4.reduce((s, r) => s + (r.eps ?? 0), 0)
      : null;

  // YoY 比較用 map
  const epsMap = new Map<string, number | null>();
  data.forEach((r) => epsMap.set(`${r.report_year}-${r.report_quarter}`, r.eps));

  const maxEps = Math.max(...data.map((r) => Math.abs(r.eps ?? 0)), 0.01);

  const fmt = (n: number | null | undefined) =>
    n == null
      ? "-"
      : (n / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const pct = (a: number | null, b: number | null) => {
    if (a == null || b == null || b === 0) return "-";
    const v = ((a - b) / Math.abs(b)) * 100;
    return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  };
  const pctCls = (a: number | null, b: number | null) => {
    if (a == null || b == null || b === 0) return "";
    return a > b ? "text-red-400" : a < b ? "text-green-400" : "";
  };

  // 最新在上（API 已倒序，直接用）
  const sorted = data;

  return (
    <div className="space-y-6">
      {/* 近四季合計 */}
      {trailing4Q != null && (
        <div className="flex items-center gap-4 rounded-md bg-accent/5 px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">近四季 EPS 合計</div>
            <div className="text-lg font-bold text-accent">
              {trailing4Q.toFixed(2)} 元
            </div>
          </div>
          <div className="text-xs text-slate-500">
            （{last4
              .map((r) => `${r.report_year}Q${r.report_quarter}`)
              .reverse()
              .join(" + ")}
            ）
          </div>
        </div>
      )}

      {/* 目標價試算器 */}
      <TargetPriceCalculator code={code} trailingEps={trailing4Q} />

      {/* EPS 歷史表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border text-slate-500">
              <th className="px-2 py-2 text-left">季度</th>
              <th className="px-2 py-2 text-right">EPS</th>
              <th className="px-2 py-2 text-right">YoY</th>
              <th className="px-2 py-2 text-right border-l border-border">
                營收（百萬）
              </th>
              <th className="px-2 py-2 text-right">營業利益</th>
              <th className="px-2 py-2 text-right">稅前淨利</th>
              <th className="px-2 py-2 w-28">趨勢</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const prevYearKey = `${r.report_year - 1}-${r.report_quarter}`;
              const prevEps = epsMap.get(prevYearKey) ?? null;
              const barPct =
                r.eps != null
                  ? Math.max(2, (Math.abs(r.eps) / maxEps) * 100)
                  : 0;
              const isNeg = r.eps != null && r.eps < 0;

              return (
                <tr
                  key={`${r.report_year}-${r.report_quarter}`}
                  className="border-b border-border/40"
                >
                  <td className="px-2 py-1.5 text-left text-slate-400">
                    {r.report_year}Q{r.report_quarter}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-medium ${isNeg ? "text-green-400" : ""}`}
                  >
                    {r.eps != null ? r.eps.toFixed(2) : "-"}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right ${pctCls(r.eps, prevEps)}`}
                  >
                    {pct(r.eps, prevEps)}
                  </td>
                  <td className="px-2 py-1.5 text-right border-l border-border">
                    {fmt(r.revenue)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {fmt(r.operating_income)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {fmt(r.pre_tax_income)}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="h-2 w-full rounded bg-surface">
                      <div
                        className={`h-2 rounded ${isNeg ? "bg-green-500" : "bg-accent"}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-slate-500">
          單位：百萬元。紅 = YoY 成長、綠 = 衰退或虧損。
        </div>
      </div>
    </div>
  );
}
