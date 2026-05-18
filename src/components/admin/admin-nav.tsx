import Link from "next/link";

const items = [
  { href: "/admin", label: "概览" },
  { href: "/admin/goods", label: "货物管理" },
  { href: "/admin/cards", label: "卡密管理" },
  { href: "/admin/logs", label: "日志" },
];

export function AdminNav() {
  return (
    <aside className="border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <Link href="/admin" className="block">
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-300">Auto Delivery</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-white">管理后台</h1>
      </Link>
      <nav className="mt-6 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/admin/logout"
          className="rounded-xl px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/10"
        >
          退出登录
        </Link>
      </nav>
    </aside>
  );
}
