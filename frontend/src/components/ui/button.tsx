import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "dangerTonal"
  | "outline"
  | "ghost"
  | "secondary"
  | "successTonal"
  | "warningTonal";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
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
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2.5",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-5 text-base",
  icon: "h-9 w-9",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}

