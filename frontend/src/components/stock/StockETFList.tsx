import { Link } from "react-router-dom";
import { ChangeLabel } from "@/components/ui/ChangeLabel";
import type { StockETFRow } from "@/hooks/use-stock";

interface Props {
  etfs: StockETFRow[];
}

export function StockETFList({ etfs }: Props) {
  if (etfs.length === 0) {
    return <p className="text-sm text-slate-500">目前沒有 ETF 持有此股票</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-slate-500">
            <th className="pb-2 pr-4">ETF</th>
            <th className="pb-2 pr-4 text-right">權重</th>
            <th className="pb-2 pr-4 text-right">變動</th>
            <th className="pb-2">狀態</th>
          </tr>
        </thead>
        <tbody>
          {etfs.map((e) => (
            <tr key={e.etf_code} className="border-b border-border/50 hover:bg-surface-secondary/50">
              <td className="py-2 pr-4">
                <Link to={`/etf/${e.etf_code}`} className="text-accent hover:underline">
                  {e.etf_name}
                </Link>
                <span className="ml-1 text-xs text-slate-500">{e.etf_code}</span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{e.weight_pct.toFixed(2)}%</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {e.weight_change != null ? (
                  <span className={e.weight_change > 0 ? "text-emerald-400" : "text-red-400"}>
                    {e.weight_change > 0 ? "+" : ""}{e.weight_change.toFixed(2)}%
                  </span>
                ) : "-"}
              </td>
              <td className="py-2">
                {e.diff_type && (
                  <ChangeLabel type={e.diff_type as "new" | "removed" | "increased" | "decreased"} compact />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
