import { NavLink } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  List,
  Star,
  Thermometer,
} from "lucide-react";

const links = [
  { to: "/", label: "觀察清單", icon: Star },
  { to: "/market", label: "大盤溫度", icon: Thermometer },
  { to: "/etf-dashboard", label: "ETF 總覽", icon: LayoutDashboard },
  { to: "/guide", label: "使用說明", icon: BookOpen },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-surface-secondary lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2 px-4 font-bold text-lg text-accent">
        <List className="h-5 w-5" />
        jstock
      </div>
      <nav className="flex-1 space-y-1 px-2 py-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
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
      </nav>
    </aside>
  );
}
