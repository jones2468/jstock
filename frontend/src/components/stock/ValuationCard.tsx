import { useValuation } from "@/hooks/use-stock-detail";
import { usePELevels } from "@/hooks/use-pe-levels";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Briefcase,
} from "lucide-react";

export function ValuationCard({ code }: { code: string }) {
  const { data, isLoading } = useValuation(code);
  const { levels } = usePELevels(code);

  if (isLoading) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-surface-secondary p-4">
        <div className="flex animate-pulse gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-surface" />
              <div className="h-6 w-20 rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pe = data.trailing_pe;
  const eps = data.trailing_eps;

  // 依使用者自設門檻分級
  const peLevel =
    pe == null
      ? { label: "無資料", color: "text-slate-500", bg: "bg-slate-500/10" }
      : pe < levels.cheap
        ? { label: "便宜", color: "text-green-400", bg: "bg-green-400/10" }
        : pe <= levels.expensive
          ? { label: "合理", color: "text-amber-400", bg: "bg-amber-400/10" }
          : { label: "偏貴", color: "text-red-400", bg: "bg-red-400/10" };

  // 法人動向
  const instNet = data.institutional_net_5d;
  const instLabel =
    instNet == null
      ? "無資料"
      : instNet > 0
        ? "買超"
        : instNet < 0
          ? "賣超"
          : "持平";
  const instColor =
    instNet == null
      ? "text-slate-500"
      : instNet > 0
        ? "text-red-400"
        : instNet < 0
          ? "text-green-400"
          : "text-slate-400";

  // ETF 動向
  const etfSignal =
    data.etf_add_14d > 0
      ? { label: `${data.etf_add_14d} 檔加碼`, color: "text-red-400" }
      : data.etf_remove_14d > 0
        ? {
            label: `${data.etf_remove_14d} 檔減碼`,
            color: "text-green-400",
          }
        : { label: "無異動", color: "text-slate-500" };

  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>研判總覽</span>
        {data.price_date && (
          <span className="ml-auto">資料日期 {data.price_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* 近四季 EPS */}
        <MetricCell
          label="近四季 EPS"
          value={eps != null ? `${eps.toFixed(2)} 元` : "-"}
          sub={
            eps != null && data.current_price
              ? `股價 ${data.current_price.toLocaleString()}`
              : undefined
          }
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
        />

        {/* 本益比 */}
        <MetricCell
          label="本益比 (P/E)"
          value={pe != null ? `${pe.toFixed(1)} 倍` : "-"}
          sub={peLevel.label}
          subColor={peLevel.color}
          icon={
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${peLevel.bg} ${peLevel.color}`}
            >
              P
            </span>
          }
        />

        {/* 合理價（EPS × cheap~expensive 倍） */}
        <MetricCell
          label="估算合理價"
          value={
            eps != null && eps > 0
              ? `${(eps * levels.cheap).toLocaleString(undefined, { maximumFractionDigits: 0 })} ~ ${(eps * levels.expensive).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "-"
          }
          sub={
            eps != null && eps > 0
              ? `${levels.cheap}~${levels.expensive} 倍本益比`
              : undefined
          }
          icon={<TrendingDown className="h-4 w-4 text-emerald-400" />}
        />

        {/* 法人動向 */}
        <MetricCell
          label="法人 5 日"
          value={instLabel}
          valueColor={instColor}
          sub={
            instNet != null
              ? `${instNet > 0 ? "+" : ""}${(instNet / 1000).toFixed(0)} 張`
              : undefined
          }
          icon={<Briefcase className="h-4 w-4 text-violet-400" />}
        />

        {/* ETF 動向 */}
        <MetricCell
          label="ETF 持倉"
          value={`${data.etf_count} 檔`}
          sub={etfSignal.label}
          subColor={etfSignal.color}
          icon={<Users className="h-4 w-4 text-sky-400" />}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  valueColor,
  sub,
  subColor,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  subColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-semibold ${valueColor ?? "text-white"}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-[11px] ${subColor ?? "text-slate-500"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
