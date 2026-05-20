import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "warning" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-[var(--primary-soft)] text-[var(--primary)] ring-1 ring-[var(--primary)]/15",
  secondary: "bg-[var(--surface-muted)] text-[var(--muted-strong)] ring-1 ring-[var(--line)]",
  destructive: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]/20",
  warning: "bg-[var(--accent)]/40 text-[var(--accent-ink)] ring-1 ring-[var(--warning)]/25",
  outline: "bg-transparent text-[var(--muted-strong)] ring-1 ring-[var(--line-strong)]",
};

export type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", badgeVariants[variant], className)} {...props} />;
}

