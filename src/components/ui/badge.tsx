import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/30",
      secondary: "bg-slate-800 text-slate-200",
      destructive: "bg-red-500/15 text-red-200 ring-1 ring-red-400/30",
      warning: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30",
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
