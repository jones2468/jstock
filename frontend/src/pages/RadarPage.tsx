import { useState } from "react";
import {
  useRadarNew,
  useRadarRemoved,
  useRadarSyncAdd,
  useRadarSyncReduce,
} from "@/hooks/use-radar";
import { RadarTable } from "@/components/radar/RadarTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Tab = "new" | "removed" | "sync-add" | "sync-reduce";

const tabs: { key: Tab; label: string }[] = [
  { key: "new", label: "新增雷達" },
  { key: "removed", label: "減碼雷達" },
  { key: "sync-add", label: "多家同步加碼" },
  { key: "sync-reduce", label: "多家同步減碼" },
];

export function RadarPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [days, setDays] = useState(5);
  const [minEtfs, setMinEtfs] = useState(2);

  const newQ = useRadarNew();
  const removedQ = useRadarRemoved();
  const syncAddQ = useRadarSyncAdd(days, minEtfs);
  const syncReduceQ = useRadarSyncReduce(days, minEtfs);

  const current = {
    new: newQ,
    removed: removedQ,
    "sync-add": syncAddQ,
    "sync-reduce": syncReduceQ,
  }[tab];

  const isSync = tab === "sync-add" || tab === "sync-reduce";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">異動雷達</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? "bg-accent text-white"
                : "bg-surface-secondary text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sync params */}
      {isSync && (
        <div className="mb-4 flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5 text-slate-400">
            近
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded border border-border bg-surface px-2 py-1 text-slate-200"
            >
              {[3, 5, 7, 14, 30].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            天
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            至少
            <select
              value={minEtfs}
              onChange={(e) => setMinEtfs(Number(e.target.value))}
              className="rounded border border-border bg-surface px-2 py-1 text-slate-200"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            家 ETF
          </label>
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-border bg-surface-secondary p-4">
        {current.isLoading ? (
          <LoadingSpinner />
        ) : (
          <RadarTable
            data={current.data ?? []}
            emptyMessage={
              tab === "new" ? "今日無新增個股" :
              tab === "removed" ? "今日無移除/減碼個股" :
              "無符合條件的同步訊號"
            }
          />
        )}
      </div>
    </div>
  );
}
