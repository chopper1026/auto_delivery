"use client";

import { AlertTriangle, X } from "lucide-react";
import { useId } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogTone = "warning" | "danger";

const toneClassNames: Record<ConfirmDialogTone, string> = {
  warning: "bg-[var(--warning-soft)] text-[var(--warning-ink)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

const confirmVariants: Record<ConfirmDialogTone, ButtonProps["variant"]> = {
  warning: "warningTonal",
  danger: "destructive",
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  tone = "warning",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog open={open}>
      <DialogContent
        className="relative max-w-md"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-label="关闭"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <DialogHeader className="pr-10">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneClassNames[tone])}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogTitle id={titleId} className="mt-3">
            {title}
          </DialogTitle>
          <DialogDescription id={descriptionId}>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariants[tone]} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
