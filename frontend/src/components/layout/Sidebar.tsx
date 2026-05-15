import { NavLink } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  List,
  Star,
  Thermometer,
  X,
} from "lucide-react";

const links = [
  { to: "/", label: "觀察清單", icon: Star },
  { to: "/market", label: "大盤溫度", icon: Thermometer },
  { to: "/etf-dashboard", label: "ETF 總覽", icon: LayoutDashboard },
  { to: "/guide", label: "使用說明", icon: BookOpen },
];

interface Props {
  // 手機 drawer 控制
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: Props) {
  return (
    <>
      {/* 手機遮罩 */}
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
          {/* 手機關閉鈕 */}
          <button
            onClick={onMobileClose}
            className="ml-auto rounded p-1 text-slate-500 hover:bg-surface hover:text-slate-200 lg:hidden"
            aria-label="關閉選單"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
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
        </nav>
      </aside>
    </>
  );
}
