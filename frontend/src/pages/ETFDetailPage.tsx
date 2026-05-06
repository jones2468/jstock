import { useParams } from "react-router-dom";

export function ETFDetailPage() {
  const { code } = useParams();
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">ETF 持股明細 — {code}</h1>
      <p className="text-slate-400">Phase 3 實作：持股表 + 加減碼標記 + Sparkline + 篩選排序</p>
    </div>
  );
}
