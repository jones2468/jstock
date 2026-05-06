import { Link } from "react-router-dom";
import type { RadarRow } from "@/hooks/use-radar";

interface Props {
  data: RadarRow[];
  emptyMessage: string;
}

export function RadarTable({ data, emptyMessage }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-slate-500">
            <th className="pb-2 pr-4">股票</th>
            <th className="pb-2 pr-4 text-right">ETF 數</th>
            <th className="pb-2">涉及 ETF</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.stock_code} className="border-b border-border/50 hover:bg-surface-secondary/50">
              <td className="py-2 pr-4">
                <Link to={`/stock/${r.stock_code}`} className="text-accent hover:underline">
                  {r.stock_name}
                </Link>
                <span className="ml-1 text-xs text-slate-500">{r.stock_code}</span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums font-medium">{r.etf_count}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1">
                  {r.etf_codes.split(",").map((code) => (
                    <Link
                      key={code}
                      to={`/etf/${code}`}
                      className="rounded bg-surface px-1.5 py-0.5 text-xs text-slate-400 hover:text-accent"
                    >
                      {code}
                    </Link>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
