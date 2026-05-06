import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useHoldings, useDiffs } from "@/hooks/use-holdings";
import { useETFs } from "@/hooks/use-etfs";
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function ETFDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: etfs } = useETFs();
  const { data: holdings, isLoading: hLoading } = useHoldings(code ?? "");
  const { data: diffs, isLoading: dLoading } = useDiffs(code ?? "");

  const etf = etfs?.find((e) => e.etf_code === code);
  const isLoading = hLoading || dLoading;

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          返回總覽
        </Link>
        <h1 className="text-xl font-bold">
          {etf ? `${etf.etf_name} (${etf.etf_code})` : code}
        </h1>
        {etf && (
          <p className="mt-0.5 text-sm text-slate-500">{etf.issuer}</p>
        )}
      </div>

      {/* Summary badges */}
      {diffs && diffs.length > 0 && (
        <div className="mb-4 flex gap-4 text-sm">
          <Stat label="持股數" value={holdings?.length ?? 0} />
          <Stat label="新增" value={diffs.filter((d) => d.diff_type === "new").length} color="emerald" />
          <Stat label="移除" value={diffs.filter((d) => d.diff_type === "removed").length} color="red" />
          <Stat label="加碼" value={diffs.filter((d) => d.diff_type === "increased").length} color="emerald" />
          <Stat label="減碼" value={diffs.filter((d) => d.diff_type === "decreased").length} color="amber" />
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : !holdings?.length ? (
        <EmptyState message="尚無持股資料（排程可能尚未執行）" />
      ) : (
        <HoldingsTable holdings={holdings} diffs={diffs ?? []} />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorCls = color
    ? { emerald: "text-emerald-400", red: "text-red-400", amber: "text-amber-400" }[color]
    : "text-slate-200";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${colorCls}`}>{value}</span>
    </div>
  );
}
