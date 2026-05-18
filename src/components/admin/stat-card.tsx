import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}
