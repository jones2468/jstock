import { useState } from "react";
import { useETFs } from "@/hooks/use-etfs";
import { ETFCard } from "@/components/etf/ETFCard";
import { ETFGroupFilter } from "@/components/etf/ETFGroupFilter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMetaStatus } from "@/hooks/use-meta";

export function DashboardPage() {
  const [group, setGroup] = useState<string | undefined>(undefined);
  const { data: etfs, isLoading, error } = useETFs(group);
  const { data: meta } = useMetaStatus();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">ETF 總覽</h1>
          {meta?.last_updated && (
            <p className="mt-1 text-xs text-slate-500">
              資料更新：{meta.last_updated}
            </p>
          )}
        </div>
        <ETFGroupFilter selected={group} onChange={setGroup} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState message={`載入失敗：${(error as Error).message}`} />
      ) : !etfs?.length ? (
        <EmptyState message="尚無 ETF 資料" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {etfs.map((etf) => (
            <ETFCard key={etf.etf_code} etf={etf} />
          ))}
        </div>
      )}
    </div>
  );
}
