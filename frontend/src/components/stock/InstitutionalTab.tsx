import { useInstitutional } from "@/hooks/use-stock-detail";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function InstitutionalTab({ code }: { code: string }) {
  const { data, isLoading } = useInstitutional(code, 60);

  if (isLoading) return <LoadingSpinner />;
  if (!data?.length)
    return <EmptyState message="尚無三大法人資料（每日 16:30 後更新）" />;

  // 累積買賣超（從最舊算到最新）
  let cumForeign = 0;
  let cumInvest = 0;
  let cumDealer = 0;
  const sorted = [...data].reverse();
  const cum = sorted.map((r) => {
    cumForeign += r.foreign_net ?? 0;
    cumInvest += r.invest_net ?? 0;
    cumDealer += r.dealer_net ?? 0;
    return {
      ...r,
      cumForeign,
      cumInvest,
      cumDealer,
    };
  });
  const recent = [...cum].reverse(); // 最新在上

  const fmt = (n: number | null | undefined) => {
    if (n == null) return "-";
    const k = Math.round(n / 1000);
    return k.toLocaleString();
  };
  const cls = (n: number | null | undefined) =>
    n == null ? "" : n > 0 ? "text-red-400" : n < 0 ? "text-green-400" : "";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-slate-500">
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-right">外資買超</th>
            <th className="px-2 py-2 text-right">投信買超</th>
            <th className="px-2 py-2 text-right">自營買超</th>
            <th className="px-2 py-2 text-right">合計</th>
            <th className="px-2 py-2 text-right border-l border-border">外資累計</th>
            <th className="px-2 py-2 text-right">投信累計</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.trade_date} className="border-b border-border/40">
              <td className="px-2 py-1.5 text-left text-slate-400">
                {r.trade_date}
              </td>
              <td className={`px-2 py-1.5 text-right ${cls(r.foreign_net)}`}>
                {fmt(r.foreign_net)}
              </td>
              <td className={`px-2 py-1.5 text-right ${cls(r.invest_net)}`}>
                {fmt(r.invest_net)}
              </td>
              <td className={`px-2 py-1.5 text-right ${cls(r.dealer_net)}`}>
                {fmt(r.dealer_net)}
              </td>
              <td className={`px-2 py-1.5 text-right font-medium ${cls(r.total_net)}`}>
                {fmt(r.total_net)}
              </td>
              <td className={`px-2 py-1.5 text-right border-l border-border ${cls(r.cumForeign)}`}>
                {fmt(r.cumForeign)}
              </td>
              <td className={`px-2 py-1.5 text-right ${cls(r.cumInvest)}`}>
                {fmt(r.cumInvest)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-slate-500">
        單位：張（千股）。紅色 = 買超、綠色 = 賣超。
      </div>
    </div>
  );
}
