import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
