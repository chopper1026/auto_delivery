import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function GoodsDeleteDialog({
  open,
  onOpenChange,
  goodsName,
  error,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goodsName: string;
  error?: Error | null;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="relative max-w-md">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-label="关闭"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <DialogHeader className="pr-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-3">确认删除货物？</DialogTitle>
          <DialogDescription>{goodsName} 将从库存管理中移除，未关联卡密的库存文件记录也会一起删除。</DialogDescription>
        </DialogHeader>

        {error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error.message}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {pending ? "删除中" : "确认删除"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
