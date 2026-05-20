import { Archive, Boxes, ClipboardList, LayoutDashboard, PackageCheck, Settings } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const items = [
  { href: "/admin", label: "工作台", icon: LayoutDashboard, end: true },
  { href: "/admin/goods", label: "货物", icon: Boxes },
  { href: "/admin/cards", label: "卡密", icon: Archive },
  { href: "/admin/logs", label: "日志", icon: ClipboardList },
  { href: "/admin/settings", label: "设置", icon: Settings },
];

export function AdminNav() {
  return (
    <aside className="z-30 border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
      <div className="flex items-center justify-between gap-4 lg:block">
        <Link to="/admin" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--primary-foreground)]">
            <PackageCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="brand-script text-[26px] font-bold leading-none text-[var(--primary)]">AutoDelivery</p>
            <h1 className="mt-0.5 text-xs font-medium leading-4 text-[var(--ink)]">管理控制台</h1>
          </div>
        </Link>
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive ? "text-[var(--ink)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute inset-0 rounded-lg bg-[var(--primary-soft)]" /> : null}
                  <Icon className="relative h-4 w-4" aria-hidden="true" />
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
