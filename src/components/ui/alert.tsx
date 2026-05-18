import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--muted-strong)]", className)} role="alert" {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold text-[var(--ink)]", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-[var(--muted)]", className)} {...props} />;
}
