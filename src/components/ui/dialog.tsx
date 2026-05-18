"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  children,
}: {
  open?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/45 p-4">{children}</div>;
}

export function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]", className)} {...props} />;
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold text-[var(--ink)]", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--muted)]", className)} {...props} />;
}
