import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  type ButtonHTMLAttributes,
  isValidElement,
  type OptionHTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "name" | "onChange" | "value" | "defaultValue"> & {
  children: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
};

const estimatedMenuHeight = 220;

function optionText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  return Children.toArray(children).map(optionText).join("");
}

function getOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== "option") {
      return [];
    }

    const label = optionText(child.props.children);
    return {
      value: child.props.value !== undefined ? String(child.props.value) : label,
      label,
      disabled: child.props.disabled,
    };
  });
}

export function Select({
  className,
  children,
  defaultValue,
  value,
  onValueChange,
  id,
  name,
  disabled,
  required,
  ...props
}: SelectProps) {
  const options = useMemo(() => getOptions(children), [children]);
  const fallbackValue = defaultValue ?? options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function getMenuPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const gutter = 12;
    const width = Math.max(rect.width, 160);
    const left = Math.min(Math.max(gutter, rect.left), Math.max(gutter, window.innerWidth - width - gutter));
    const belowTop = rect.bottom + 8;
    const hasRoomBelow = belowTop + estimatedMenuHeight <= window.innerHeight - gutter;
    const top = hasRoomBelow ? belowTop : Math.max(gutter, rect.top - estimatedMenuHeight - 8);
    const maxHeight = Math.min(estimatedMenuHeight, window.innerHeight - top - gutter);

    return { top, left, width, maxHeight };
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }

    const position = getMenuPosition();
    if (!position) return;
    setMenuPosition(position);
    setOpen(true);
  }

  function selectValue(nextValue: string) {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const position = getMenuPosition();
      if (position) setMenuPosition(position);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      {name ? <input type="hidden" name={name} value={selectedOption?.value ?? selectedValue} required={required} /> : null}
      <button
        {...props}
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--ink)] outline-none transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-70 focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary-soft)]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{selectedOption?.label ?? ""}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--muted-strong)] transition-transform", open ? "rotate-180" : "")} aria-hidden="true" />
      </button>
      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-labelledby={id}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
              }}
              className="fixed z-50 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]"
            >
              {options.map((option) => {
                const selected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onClick={() => selectValue(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition",
                      selected ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--ink)] hover:bg-[var(--surface-muted)]",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
