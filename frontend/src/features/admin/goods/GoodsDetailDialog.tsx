import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function GoodsDetailDialog({
  open,
  onOpenChange,
  goodsName,
  goodsType,
  detailSections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goodsName: string;
  goodsType: "TEXT" | "FILE";
  detailSections: Array<{ label: string; content: string; empty: boolean }>;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="relative max-w-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-label="关闭"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <DialogHeader className="pr-10">
          <DialogTitle>{goodsName}</DialogTitle>
          <DialogDescription>{goodsType === "TEXT" ? "文本货物详情" : "文件货物详情"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {detailSections.map((section) => (
            <section key={section.label} className="rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-4">
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[var(--muted-strong)]">{section.label}</h3>
              <pre
                className={cn(
                  "mt-3 max-h-[48vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6",
                  section.empty ? "text-[var(--muted)]" : "text-[var(--ink)]",
                )}
              >
                {section.content}
              </pre>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
