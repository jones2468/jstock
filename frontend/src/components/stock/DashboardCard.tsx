import { useState, type ReactNode } from "react";
import { Maximize2, X, GripVertical } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}

// 個股 dashboard 卡片：標題（drag handle）+ 內容（fit container）+ 全螢幕展開
export function DashboardCard({ title, children, extra }: Props) {
  const [expanded, setExpanded] = useState(false);

  // 標題列 — 加 jstock-card-handle class 讓 react-grid-layout 知道這裡可拖
  const header = (
    <div className="jstock-card-handle flex shrink-0 cursor-move items-center gap-2 border-b border-border/60 px-3 py-2 select-none">
      <GripVertical className="h-3.5 w-3.5 text-slate-600" />
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {extra && (
        <div className="ml-auto cursor-default" onMouseDown={(e) => e.stopPropagation()}>
          {extra}
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${extra ? "ml-2" : "ml-auto"} cursor-pointer rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200`}
        title="展開"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-secondary">
        {header}
        <div className="flex-1 overflow-auto p-3">{children}</div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-surface-secondary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
              {extra && <div className="ml-auto">{extra}</div>}
              <button
                onClick={() => setExpanded(false)}
                className={`${extra ? "ml-2" : "ml-auto"} rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200`}
                title="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
