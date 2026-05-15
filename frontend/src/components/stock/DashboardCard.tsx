import { useState, type ReactNode } from "react";
import { Maximize2, X } from "lucide-react";

interface Props {
  title: string;
  // 卡片內固定高度（手機展開時不限制）。dialog 時忽略
  maxHeight?: string;
  children: ReactNode;
  // 給卡片頭右側放自訂 toolbar（時段切換等）
  extra?: ReactNode;
}

// 個股 dashboard 卡片：標題 + 內容區（可滾）+ 全螢幕展開
export function DashboardCard({ title, maxHeight = "360px", children, extra }: Props) {
  const [expanded, setExpanded] = useState(false);

  const content = (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {extra && <div className="ml-auto">{extra}</div>}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className={`${extra ? "ml-2" : "ml-auto"} rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200`}
            title="展開"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="ml-2 rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200"
            title="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className="flex-1 overflow-auto p-3"
        style={!expanded ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </>
  );

  return (
    <>
      {/* 一般卡片 */}
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-secondary">
        {!expanded && content}
        {expanded && (
          <div className="flex items-center justify-center px-3 py-12 text-xs text-slate-500">
            已展開為全螢幕視窗
          </div>
        )}
      </div>

      {/* 全螢幕 dialog */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-surface-secondary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}
