import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Trash2,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import {
  useWatchlistDashboard,
  type DashboardRow,
} from "@/hooks/use-watchlist-dashboard";
import { useRadarSyncAdd, useRadarSyncReduce } from "@/hooks/use-radar";
import { usePELevelsMap } from "@/hooks/use-pe-levels";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  peSignal,
  instSignal,
  etfSignal,
  overallSignal,
  signalPriority,
  signalDotClass,
  signalLabel,
  signalTextClass,
  type Signal,
} from "@/lib/signals";

const QUICK_ADD = [
  { code: "2330", name: "台積電" },
  { code: "2317", name: "鴻海" },
  { code: "0050", name: "元大台灣50" },
  { code: "0056", name: "元大高股息" },
];

function formatBigNumber(v: number | null): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e8) return `${(v / 1e8).toFixed(1)}億`;
  if (abs >= 1e4) return `${(v / 1e4).toFixed(0)}萬`;
  return v.toLocaleString();
}

type SortKey = "signal" | "code" | "price" | "change" | "pe" | "inst";
type SortDir = "asc" | "desc";

// null 永遠排到最後
function compareNullable(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

export function WatchlistPage() {
  const { stocks, etfs, toggleItem } = useFavorites();
  const allCodes = useMemo(() => [...stocks, ...etfs], [stocks, etfs]);

  const { data: rows, isLoading } = useWatchlistDashboard(allCodes);
  const { get: getLevels } = usePELevelsMap();
  const [sortKey, setSortKey] = useState<SortKey>("signal");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // 訊號預設升序（紅→黃→綠→無）；數字欄預設降序（大→小）
      setSortDir(key === "signal" || key === "code" ? "asc" : "desc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    const enriched = rows.map((r) => {
      const levels = getLevels(r.stock_code);
      const pe = peSignal(r.trailing_pe, levels);
      const inst = instSignal(r.institutional_net_5d);
      const etf = etfSignal(r.etf_add_14d, r.etf_remove_14d);
      const overall = overallSignal([pe, inst, etf]);
      return { row: r, pe, inst, etf, overall, levels };
    });

    return enriched.sort((a, b) => {
      let primary = 0;
      switch (sortKey) {
        case "signal":
          primary = signalPriority(a.overall) - signalPriority(b.overall);
          if (sortDir === "desc") primary = -primary;
          break;
        case "code":
          primary = a.row.stock_code.localeCompare(b.row.stock_code);
          if (sortDir === "desc") primary = -primary;
          break;
        case "price":
          primary = compareNullable(a.row.current_price, b.row.current_price, sortDir);
          break;
        case "change":
          primary = compareNullable(a.row.change_val, b.row.change_val, sortDir);
          break;
        case "pe":
          primary = compareNullable(a.row.trailing_pe, b.row.trailing_pe, sortDir);
          break;
        case "inst":
          primary = compareNullable(
            a.row.institutional_net_5d,
            b.row.institutional_net_5d,
            sortDir
          );
          break;
      }
      if (primary !== 0) return primary;
      return a.row.stock_code.localeCompare(b.row.stock_code);
    });
  }, [rows, getLevels, sortKey, sortDir]);

  const total = allCodes.length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
        <h1 className="text-xl font-bold">觀察清單</h1>
        <span className="text-sm text-slate-500">({total})</span>
        <span className="ml-auto text-xs text-slate-500">
          {sortKey === "signal" && sortDir === "asc"
            ? "訊號優先 · 紅 → 黃 → 綠 → 無"
            : "點欄位標題改變排序"}
        </span>
      </div>

      {total === 0 ? (
        <EmptyState />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-surface-secondary text-xs text-slate-500">
              <tr className="text-left">
                <th className="w-12 py-2 pl-3">
                  <SortHeader
                    label="訊號"
                    column="signal"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                  />
                </th>
                <th className="py-2 pr-3">
                  <SortHeader
                    label="代號 / 名稱"
                    column="code"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                  />
                </th>
                <th className="py-2 pr-3 text-right">
                  <SortHeader
                    label="現價"
                    column="price"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2 pr-3 text-right">
                  <SortHeader
                    label="漲跌"
                    column="change"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2 pr-3 text-right">
                  <SortHeader
                    label="P/E"
                    column="pe"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2 pr-3 text-right">合理價（依本益比門檻）</th>
                <th className="py-2 pr-3 text-right">
                  <SortHeader
                    label="5 日法人"
                    column="inst"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-2 pr-3">ETF 動向</th>
                <th className="w-10 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ row, pe, inst, etf, overall, levels }) => (
                <Row
                  key={row.stock_code}
                  row={row}
                  peTone={pe}
                  instTone={inst}
                  etfTone={etf}
                  overall={overall}
                  levels={levels}
                  onRemove={() => {
                    const type = etfs.includes(row.stock_code) ? "etf" : "stock";
                    toggleItem(type, row.stock_code);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && <RadarMiniSection />}
    </div>
  );
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === column;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={`inline-flex items-center gap-1 text-xs transition-colors hover:text-slate-200 ${
        active ? "text-accent" : "text-slate-500"
      } ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      <span>{label}</span>
      <Icon className="h-3 w-3 shrink-0" />
    </button>
  );
}

function Row({
  row,
  peTone,
  instTone,
  etfTone,
  overall,
  levels,
  onRemove,
}: {
  row: DashboardRow;
  peTone: Signal;
  instTone: Signal;
  etfTone: Signal;
  overall: Signal;
  levels: { cheap: number; fair: number; expensive: number };
  onRemove: () => void;
}) {
  const tooltip = `P/E 門檻: <${levels.cheap}/${levels.fair}/${levels.expensive}> · P/E: ${signalLabel(peTone)} · 法人: ${signalLabel(instTone)} · ETF: ${signalLabel(etfTone)}`;
  const fair = row.trailing_eps;
  return (
    <tr className="border-t border-border/50 hover:bg-surface-secondary/40">
      <td className="py-3 pl-3">
        <div
          className={`h-2.5 w-2.5 rounded-full ${signalDotClass(overall)}`}
          title={tooltip}
        />
      </td>
      <td className="py-3 pr-3">
        <Link
          to={`/stock/${row.stock_code}`}
          className="text-accent hover:underline"
        >
          {row.stock_name ?? row.stock_code}
        </Link>
        <span className="ml-1 text-xs text-slate-500">{row.stock_code}</span>
      </td>
      <td className="py-3 pr-3 text-right font-medium tabular-nums">
        {row.current_price?.toLocaleString() ?? "—"}
      </td>
      <td className="py-3 pr-3 text-right tabular-nums">
        {row.change_val != null ? (
          <span
            className={
              row.change_val >= 0 ? "text-red-400" : "text-green-400"
            }
          >
            {row.change_val >= 0 ? "+" : ""}
            {row.change_val.toFixed(2)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td
        className={`py-3 pr-3 text-right tabular-nums ${signalTextClass(peTone)}`}
      >
        {row.trailing_pe?.toFixed(1) ?? "—"}
      </td>
      <td
        className="py-3 pr-3 text-right text-xs text-slate-400 tabular-nums"
        title={`便宜 ${levels.cheap}× / 合理 ${levels.fair}× / 偏貴 ${levels.expensive}×`}
      >
        {fair != null
          ? `${(fair * levels.cheap).toFixed(0)} / ${(fair * levels.fair).toFixed(0)} / ${(fair * levels.expensive).toFixed(0)}`
          : "—"}
      </td>
      <td
        className={`py-3 pr-3 text-right tabular-nums ${signalTextClass(instTone)}`}
      >
        {formatBigNumber(row.institutional_net_5d)}
      </td>
      <td className="py-3 pr-3">
        <span className="text-xs text-slate-400">
          {row.etf_count} 檔持有
        </span>
        {(row.etf_add_14d > 0 || row.etf_remove_14d > 0) && (
          <span className={`ml-2 text-xs ${signalTextClass(etfTone)}`}>
            14d +{row.etf_add_14d} / -{row.etf_remove_14d}
          </span>
        )}
      </td>
      <td className="py-3 pr-2">
        <button
          onClick={onRemove}
          className="rounded p-1 text-slate-600 hover:bg-red-400/10 hover:text-red-400"
          title="從觀察清單移除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function EmptyState() {
  const { toggleItem } = useFavorites();
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-8 text-center">
      <Star className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      <h2 className="mb-1 text-base font-semibold">尚未追蹤任何標的</h2>
      <p className="mb-5 text-sm text-slate-500">
        在頂部搜尋框找到股票後點 ⭐ 加入觀察清單，<br />
        或先試試這幾支熱門：
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_ADD.map(({ code, name }) => (
          <button
            key={code}
            onClick={() => toggleItem("stock", code)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
          >
            <span className="font-medium">{name}</span>
            <span className="ml-1 text-xs text-slate-500">{code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RadarMiniSection() {
  const { data: adds, isLoading: addLoading } = useRadarSyncAdd(5, 2);
  const { data: removes, isLoading: rmLoading } = useRadarSyncReduce(5, 2);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-slate-200">
          近 5 日 ETF 同步動作
        </h2>
        <span className="text-xs text-slate-500">≥ 2 檔 ETF 同向</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RadarPanel
          title="同步加碼 TOP 5"
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          rows={adds?.slice(0, 5)}
          isLoading={addLoading}
          tone="up"
        />
        <RadarPanel
          title="同步減碼 TOP 5"
          icon={<TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
          rows={removes?.slice(0, 5)}
          isLoading={rmLoading}
          tone="down"
        />
      </div>
    </section>
  );
}

function RadarPanel({
  title,
  icon,
  rows,
  isLoading,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  rows:
    | { stock_code: string; stock_name: string; etf_count: number }[]
    | undefined;
  isLoading: boolean;
  tone: "up" | "down";
}) {
  const { toggleItem, checkItem } = useFavorites();
  const toneClass = tone === "up" ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <div className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300">
        {icon}
        {title}
      </div>
      {isLoading ? (
        <div className="py-4 text-center text-xs text-slate-500">載入中…</div>
      ) : !rows || rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">無資料</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const inList = checkItem("stock", r.stock_code);
            return (
              <li
                key={r.stock_code}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <Link
                  to={`/stock/${r.stock_code}`}
                  className="flex-1 truncate text-accent hover:underline"
                >
                  {r.stock_name}
                  <span className="ml-1 text-xs text-slate-500">
                    {r.stock_code}
                  </span>
                </Link>
                <span className={`text-xs tabular-nums ${toneClass}`}>
                  {r.etf_count} 檔
                </span>
                <button
                  onClick={() => toggleItem("stock", r.stock_code)}
                  className={`rounded p-1 transition-colors ${
                    inList
                      ? "text-amber-400"
                      : "text-slate-600 hover:text-amber-400"
                  }`}
                  title={inList ? "已在觀察清單" : "加入觀察清單"}
                >
                  <Star
                    className="h-3 w-3"
                    fill={inList ? "currentColor" : "none"}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
