import { useState } from "react";
import { Link } from "react-router-dom";
import { useETFs } from "@/hooks/use-etfs";
import { useOverlapCompare, useOverlapMatrix } from "@/hooks/use-overlap";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function OverlapPage() {
  const { data: etfs } = useETFs();
  const [selected, setSelected] = useState<string[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);

  const { data: compare, isLoading: cLoading } = useOverlapCompare(selected);
  const { data: matrix, isLoading: mLoading } = useOverlapMatrix();

  function toggleETF(code: string) {
    setSelected((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length >= 4
          ? prev
          : [...prev, code]
    );
  }

  const etfNames = new Map(etfs?.map((e) => [e.etf_code, e.etf_name]) ?? []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">跨 ETF 重疊分析</h1>
        <button
          onClick={() => setShowMatrix((v) => !v)}
          className="rounded-md bg-surface-secondary px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          {showMatrix ? "交叉比對" : "重疊矩陣"}
        </button>
      </div>

      {showMatrix ? (
        /* Matrix view */
        <div className="rounded-lg border border-border bg-surface-secondary p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-400">N x N 重疊矩陣</h2>
          {mLoading ? (
            <LoadingSpinner />
          ) : !matrix?.length ? (
            <p className="text-sm text-slate-500">尚無資料</p>
          ) : (
            <MatrixTable matrix={matrix} etfNames={etfNames} />
          )}
        </div>
      ) : (
        /* Compare view */
        <>
          {/* ETF selector */}
          <div className="mb-4">
            <p className="mb-2 text-sm text-slate-500">選擇 2~4 檔 ETF 進行比對：</p>
            <div className="flex flex-wrap gap-2">
              {etfs
                ?.filter((e) => e.group_tag === "tw")
                .map((e) => (
                  <button
                    key={e.etf_code}
                    onClick={() => toggleETF(e.etf_code)}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      selected.includes(e.etf_code)
                        ? "bg-accent text-white"
                        : "bg-surface-secondary text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {e.etf_code} {e.etf_name}
                  </button>
                ))}
            </div>
          </div>

          {/* Results */}
          {selected.length >= 2 && (
            <div className="rounded-lg border border-border bg-surface-secondary p-4">
              {cLoading ? (
                <LoadingSpinner />
              ) : !compare ? (
                <p className="text-sm text-slate-500">載入中...</p>
              ) : (
                <>
                  <div className="mb-3 text-sm text-slate-400">
                    共同持股：<span className="font-semibold text-accent">{compare.overlap_count}</span> 檔
                  </div>
                  {compare.common_stocks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-slate-500">
                            <th className="pb-2 pr-4">股票</th>
                            {compare.etf_codes.map((code) => (
                              <th key={code} className="pb-2 pr-4 text-right">
                                {code}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compare.common_stocks.map((s) => (
                            <tr key={s.stock_code} className="border-b border-border/50">
                              <td className="py-2 pr-4">
                                <Link to={`/stock/${s.stock_code}`} className="text-accent hover:underline">
                                  {s.stock_name}
                                </Link>
                                <span className="ml-1 text-xs text-slate-500">{s.stock_code}</span>
                              </td>
                              {compare.etf_codes.map((code) => (
                                <td key={code} className="py-2 pr-4 text-right tabular-nums">
                                  {s.weights[code]?.toFixed(2) ?? "-"}%
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">這些 ETF 沒有共同持股</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatrixTable({
  matrix,
  etfNames,
}: {
  matrix: Array<{ etf_a: string; etf_b: string; overlap_count: number }>;
  etfNames: Map<string, string>;
}) {
  const codes = [...new Set(matrix.flatMap((m) => [m.etf_a, m.etf_b]))].sort();
  const lookup = new Map(matrix.map((m) => [`${m.etf_a}-${m.etf_b}`, m.overlap_count]));

  function getCount(a: string, b: string): number | null {
    if (a === b) return null;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    return lookup.get(key) ?? 0;
  }

  const maxCount = Math.max(...matrix.map((m) => m.overlap_count), 1);

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {codes.map((c) => (
              <th key={c} className="p-1 text-center text-slate-400 font-normal" style={{ writingMode: "vertical-lr" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((row) => (
            <tr key={row}>
              <td className="p-1 text-right text-slate-400 whitespace-nowrap pr-2">{row}</td>
              {codes.map((col) => {
                const count = getCount(row, col);
                if (count === null) {
                  return <td key={col} className="p-1 text-center text-slate-600">-</td>;
                }
                const intensity = count / maxCount;
                return (
                  <td
                    key={col}
                    className="p-1 text-center tabular-nums"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity * 0.5})`,
                      color: intensity > 0.3 ? "#e2e8f0" : "#94a3b8",
                    }}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
