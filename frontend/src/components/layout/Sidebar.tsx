import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  List,
  Plus,
  Star,
  Thermometer,
  X,
} from "lucide-react";
import { useWatchlistGroups } from "@/hooks/use-watchlist-groups";

const bottomLinks = [
  { to: "/market", label: "大盤溫度", icon: Thermometer },
  { to: "/etf-dashboard", label: "ETF 總覽", icon: LayoutDashboard },
  { to: "/guide", label: "使用說明", icon: BookOpen },
];

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: Props) {
  const { groups, activeId, setActiveGroup, addGroup } = useWatchlistGroups();
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  function handleAddGroup() {
    const name = prompt("新群組名稱：");
    if (!name?.trim()) return;
    const g = addGroup(name.trim());
    setActiveGroup(g.id);
    navigate(`/watchlist/${g.id}`);
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface-secondary transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center gap-2 px-4 font-bold text-lg text-accent">
          <List className="h-5 w-5" />
          jstock
          <button
            onClick={onMobileClose}
            className="ml-auto rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200 lg:hidden"
            aria-label="關閉選單"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {/* 觀察清單群組 */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-surface hover:text-slate-200 transition-colors"
          >
            <Star className="h-4 w-4" />
            <span className="flex-1 text-left">觀察清單</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
          </button>

          {expanded && (
            <div className="ml-3 space-y-0.5 border-l border-border/50 pl-2">
              {groups.map((g) => (
                <NavLink
                  key={g.id}
                  to={g.id === "default" ? "/" : `/watchlist/${g.id}`}
                  end
                  onClick={() => {
                    setActiveGroup(g.id);
                    onMobileClose?.();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-slate-500 hover:bg-surface hover:text-slate-300"
                    }`
                  }
                >
                  {g.name}
                </NavLink>
              ))}
              <button
                onClick={handleAddGroup}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-surface hover:text-slate-400 transition-colors"
              >
                <Plus className="h-3 w-3" />
                新增群組
              </button>
            </div>
          )}

          {/* 其他連結 */}
          <div className="pt-2">
            {bottomLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-slate-400 hover:bg-surface hover:text-slate-200"
                  }`
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
