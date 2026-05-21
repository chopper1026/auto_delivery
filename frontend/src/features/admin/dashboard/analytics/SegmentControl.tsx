import { cn } from "@/lib/utils";
import type { SegmentOption } from "./types";

export function SegmentControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "sm",
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-fit rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-1 font-semibold text-[var(--muted-strong)]",
        size === "md" ? "text-sm" : "text-xs",
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md transition-[background-color,color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
              size === "md" ? "px-3 py-1.5" : "px-2.5 py-1.5",
              selected
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_-18px_oklch(0.19_0.021_165/.9)]"
                : "hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
