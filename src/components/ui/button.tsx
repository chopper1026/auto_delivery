import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
        destructive: "bg-[var(--danger)] text-[var(--primary-foreground)] hover:bg-[var(--danger-hover)]",
        dangerTonal:
          "border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-ink)] shadow-none hover:border-[var(--danger)] hover:bg-[var(--danger-soft-hover)]",
        outline: "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)]",
        ghost: "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
        secondary: "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)]",
        successTonal:
          "border border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-ink)] shadow-none hover:border-[var(--primary)] hover:bg-[var(--success-soft-hover)]",
        warningTonal:
          "border border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] shadow-none hover:border-[var(--warning)] hover:bg-[var(--warning-soft-hover)]",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
