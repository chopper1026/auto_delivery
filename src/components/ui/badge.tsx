import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-[var(--primary-soft)] text-[var(--primary)] ring-1 ring-[var(--primary)]/15",
      secondary: "bg-[var(--surface-muted)] text-[var(--muted-strong)] ring-1 ring-[var(--line)]",
      destructive: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]/20",
      warning: "bg-[var(--accent)]/40 text-[var(--accent-ink)] ring-1 ring-[var(--warning)]/25",
      outline: "bg-transparent text-[var(--muted-strong)] ring-1 ring-[var(--line-strong)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
