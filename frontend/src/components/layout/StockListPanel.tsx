import { useMemo } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useGroupItems } from "@/hooks/use-watchlist-groups";
import {
  useWatchlistDashboard,
  type DashboardRow,
} from "@/hooks/use-watchlist-dashboard";

function priceColor(change: number | null) {
  if (change == null || change === 0) return "text-slate-300";
  return change > 0 ? "text-red-400" : "text-green-400";
}

function StockItem({ row, active }: { row: DashboardRow; active: boolean }) {
  const change = row.change_val;
  const color = priceColor(change);
  const prevClose =
    row.current_price != null && change != null
      ? row.current_price - change
      : null;
  const pct =
    prevClose != null && prevClose !== 0 && change != null
      ? (change / prevClose) * 100
      : null;

  return (
    <NavLink
      to={`/stock/${row.stock_code}`}
      className={`block border-b border-border/40 px-3 py-2.5 transition-colors ${
        active ? "bg-accent/10" : "hover:bg-surface/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: name + code */}
        <div className="min-w-0">
          <div className={`text-sm font-bold truncate ${active ? "text-accent" : "text-slate-200"}`}>
            {row.stock_name ?? row.stock_code}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.stock_code} 市
          </div>
        </div>

        {/* Right: price + change */}
        <div className="text-right shrink-0">
          <div className={`text-sm font-bold tabular-nums ${color}`}>
            {row.current_price?.toLocaleString() ?? "—"}
          </div>
          {change != null && (
            <div className={`text-[11px] tabular-nums ${color}`}>
              {change > 0 ? "+" : ""}{change.toFixed(2)}
              {pct != null && ` ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
            </div>
          )}
        </div>
      </div>
    </NavLink>
  );
}

export function StockListPanel({ groupId }: { groupId: string }) {
  const { code: activeCode } = useParams<{ code: string }>();
  const { stocks, etfs } = useGroupItems(groupId);
  const allCodes = useMemo(() => [...stocks, ...etfs], [stocks, etfs]);
  const { data: rows } = useWatchlistDashboard(allCodes);
  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => a.stock_code.localeCompare(b.stock_code));
  }, [rows]);

  return (
    <div className="flex h-full w-56 flex-col border-r border-border bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-slate-400">
          名稱 ⓘ
        </span>
        <span className="text-xs text-slate-500">漲跌幅</span>
      </div>

      {/* Stock list */}
      <div className="flex-1 overflow-y-auto">
        {allCodes.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            尚未加入股票
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            載入中…
          </div>
        ) : (
          sorted.map((row) => (
            <StockItem
              key={row.stock_code}
              row={row}
              active={row.stock_code === activeCode}
            />
          ))
        )}
      </div>

      {/* Footer: add stock */}
      <div className="border-t border-border px-3 py-2">
        <button
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('input[placeholder*="搜尋"]');
            input?.focus();
          }}
          className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-slate-500 hover:bg-surface hover:text-slate-300 transition-colors"
        >
          <Plus className="h-3 w-3" />
          新增追蹤股票
        </button>
      </div>
    </div>
  );
}
