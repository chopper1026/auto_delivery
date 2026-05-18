import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300",
  {
    variants: {
      variant: {
        default: "bg-cyan-300 px-4 py-2.5 text-slate-950 hover:bg-cyan-200",
        destructive: "bg-red-500 px-4 py-2.5 text-white hover:bg-red-400",
        outline: "border border-slate-700 bg-transparent px-4 py-2.5 text-slate-100 hover:bg-slate-900",
        ghost: "px-4 py-2.5 text-slate-200 hover:bg-slate-900",
      },
      size: {
        default: "h-10",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 px-6 text-base",
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
