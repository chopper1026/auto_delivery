import { Archive, Boxes, ClipboardList, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "工作台", icon: LayoutDashboard, end: true },
  { href: "/admin/goods", label: "货物", icon: Boxes },
  { href: "/admin/cards", label: "卡密", icon: Archive },
  { href: "/admin/logs", label: "日志", icon: ClipboardList },
  { href: "/admin/settings", label: "设置", icon: Settings },
];

export function getAdminPageTitle(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/admin";
  const match = [...adminNavItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => normalizedPath === item.href || (!item.end && normalizedPath.startsWith(`${item.href}/`)));

  return match?.label ?? "工作台";
}
