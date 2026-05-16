import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, Plus, Thermometer } from "lucide-react";
import { useWatchlistGroups } from "@/hooks/use-watchlist-groups";

const NAV_LINKS = [
  { to: "/market", label: "溫度", icon: Thermometer },
  { to: "/etf-dashboard", label: "ETF", icon: LayoutDashboard },
  { to: "/guide", label: "說明", icon: BookOpen },
];

export function GroupTabs() {
  const { groups, setActiveGroup, addGroup } = useWatchlistGroups();
  const navigate = useNavigate();

  function handleAdd() {
    const name = prompt("新群組名稱：");
    if (!name?.trim()) return;
    const g = addGroup(name.trim());
    setActiveGroup(g.id);
    navigate(g.id === "default" ? "/" : `/watchlist/${g.id}`);
  }

  return (
    <div className="flex h-full w-12 flex-col border-r border-border bg-surface-secondary">
      {/* Watchlist groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => {
          const to = g.id === "default" ? "/" : `/watchlist/${g.id}`;
          return (
            <NavLink
              key={g.id}
              to={to}
              end={g.id === "default"}
              onClick={() => setActiveGroup(g.id)}
              className={({ isActive }) =>
                `group relative mx-1 mb-1 flex h-10 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-slate-500 hover:bg-surface hover:text-slate-300"
                }`
              }
              title={g.name}
            >
              <span className="max-w-[38px] truncate leading-tight text-center">
                {g.name.length <= 2 ? g.name : g.name.slice(0, 2)}
              </span>
            </NavLink>
          );
        })}

        <button
          onClick={handleAdd}
          className="mx-1 flex h-8 w-[calc(100%-8px)] items-center justify-center rounded-md text-slate-600 hover:bg-surface hover:text-slate-400 transition-colors"
          title="新增群組"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Navigation links */}
      <div className="border-t border-border py-2">
        {NAV_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `mx-1 mb-1 flex h-10 flex-col items-center justify-center rounded-md text-[10px] transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-slate-500 hover:bg-surface hover:text-slate-300"
              }`
            }
            title={l.label}
          >
            <l.icon className="h-4 w-4" />
            <span className="mt-0.5">{l.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
