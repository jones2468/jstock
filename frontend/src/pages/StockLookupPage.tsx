import { useParams } from "react-router-dom";

export function StockLookupPage() {
  const { code } = useParams();
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">個股查詢 — {code}</h1>
      <p className="text-slate-400">Phase 7 實作：持有該股的 ETF + 技術線圖 + 收藏功能</p>
    </div>
  );
}
