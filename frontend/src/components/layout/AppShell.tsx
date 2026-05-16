import { Outlet } from "react-router-dom";
import { GroupTabs } from "./GroupTabs";
import { StockListPanel } from "./StockListPanel";
import { TopBar } from "./TopBar";
import { useWatchlistGroups } from "@/hooks/use-watchlist-groups";

export function StockShell() {
  const { activeId } = useWatchlistGroups();
  return (
    <div className="flex h-screen bg-surface text-slate-200">
      <GroupTabs />
      <div className="hidden lg:block">
        <StockListPanel groupId={activeId} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3 lg:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function SimpleShell() {
  return (
    <div className="flex h-screen bg-surface text-slate-200">
      <GroupTabs />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
