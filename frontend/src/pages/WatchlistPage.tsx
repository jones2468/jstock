import { Link } from "react-router-dom";
import { Star, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/use-favorites";
import { apiPost } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface BatchPriceRow {
  stock_code: string;
  stock_name: string;
  close_price: number;
  change_val: number | null;
}

export function WatchlistPage() {
  const { stocks, etfs, toggleItem } = useFavorites();

  const { data: stockPrices, isLoading: loadingStocks } = useQuery({
    queryKey: ["watchlist-prices", stocks],
    queryFn: () =>
      apiPost<BatchPriceRow[]>("/api/v1/stocks/batch-prices", { stocks }),
    enabled: stocks.length > 0,
  });

  const { data: etfPrices, isLoading: loadingEtfs } = useQuery({
    queryKey: ["watchlist-etf-prices", etfs],
    queryFn: () =>
      apiPost<BatchPriceRow[]>("/api/v1/stocks/batch-prices", { stocks: etfs }),
    enabled: etfs.length > 0,
  });

  const stockMap = new Map(stockPrices?.map((p) => [p.stock_code, p]));
  const etfMap = new Map(etfPrices?.map((p) => [p.stock_code, p]));

  const total = stocks.length + etfs.length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
        <h1 className="text-xl font-bold">自選</h1>
        <span className="text-sm text-slate-500">({total})</span>
      </div>

      {total === 0 ? (
        <EmptyState message="還沒有自選項目。在頂部搜尋框找到標的後點星號加入。" />
      ) : (
        <div className="space-y-8">
          <Section
            title="自選股"
            count={stocks.length}
            isLoading={loadingStocks}
            rows={stocks.map((code) => ({
              code,
              hrefBase: "/stock",
              row: stockMap.get(code),
              onRemove: () => toggleItem("stock", code),
            }))}
          />
          <Section
            title="自選 ETF"
            count={etfs.length}
            isLoading={loadingEtfs}
            rows={etfs.map((code) => ({
              code,
              hrefBase: "/etf",
              row: etfMap.get(code),
              onRemove: () => toggleItem("etf", code),
            }))}
          />
        </div>
      )}
    </div>
  );
}

interface SectionRow {
  code: string;
  hrefBase: string;
  row: BatchPriceRow | undefined;
  onRemove: () => void;
}

function Section({
  title,
  count,
  isLoading,
  rows,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  rows: SectionRow[];
}) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-300">
        {title} <span className="text-slate-500">({count})</span>
      </h2>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-500">
                <th className="pb-2 pr-4">代號 / 名稱</th>
                <th className="pb-2 pr-4 text-right">收盤價</th>
                <th className="pb-2 pr-4 text-right">漲跌</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ code, hrefBase, row, onRemove }) => (
                <tr
                  key={code}
                  className="border-b border-border/50 hover:bg-surface-secondary/50"
                >
                  <td className="py-3 pr-4">
                    <Link
                      to={`${hrefBase}/${code}`}
                      className="text-accent hover:underline"
                    >
                      {row?.stock_name ?? code}
                    </Link>
                    <span className="ml-1 text-xs text-slate-500">{code}</span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {row?.close_price?.toLocaleString() ?? "-"}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {row?.change_val != null ? (
                      <span
                        className={
                          row.change_val >= 0 ? "text-red-400" : "text-green-400"
                        }
                      >
                        {row.change_val >= 0 ? "+" : ""}
                        {row.change_val.toFixed(2)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={onRemove}
                      className="rounded p-1 text-slate-600 hover:bg-red-400/10 hover:text-red-400"
                      title="移除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
