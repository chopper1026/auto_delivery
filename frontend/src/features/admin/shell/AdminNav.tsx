import { ExternalLink, LogOut, PackageCheck } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AnimatedBrandWord } from "@/features/public/shared/AnimatedBrandWord";
import { Button, buttonVariants } from "@/components/ui/button";
import { adminNavItems } from "./adminNavigation";

type AdminNavProps = {
  onLogout: () => void;
  logoutPending?: boolean;
};

export function AdminNav({ onLogout, logoutPending = false }: AdminNavProps) {
  return (
    <aside
      aria-label="管理导航"
      className="z-30 flex flex-col border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-5"
    >
      <div className="flex items-center justify-between gap-4 lg:block">
        <Link to="/admin" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--primary-foreground)]">
            <PackageCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex text-[22px] font-bold leading-none text-[var(--primary)]">
              <AnimatedBrandWord className="brand-script admin-sidebar-brand-word" />
            </p>
            <p className="mt-1 text-xs font-medium leading-4 text-[var(--ink)]">管理控制台</p>
          </div>
        </Link>
      </div>

      <nav aria-label="管理模块" className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
        {adminNavItems.map((item) => {
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

      <div aria-label="快捷操作" className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3 lg:mt-auto lg:grid lg:gap-2">
        <a href="/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "justify-start text-sm lg:w-full" })}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          打开兑换页
        </a>
        <Button type="button" variant="outline" onClick={onLogout} disabled={logoutPending} className="justify-start text-sm lg:w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {logoutPending ? "退出中" : "退出登录"}
        </Button>
      </div>
    </aside>
  );
}
