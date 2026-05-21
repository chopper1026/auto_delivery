import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteCardKeyButton({ cardKeyId, keyMask }: { cardKeyId: string; keyMask: string }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => api.deleteCardKey(cardKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardKeys"] });
      queryClient.invalidateQueries({ queryKey: ["goods"] });
      setConfirmOpen(false);
    },
  });

  return (
    <>
      <Button type="button" variant="dangerTonal" size="sm" className="px-2.5" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        删除
      </Button>

      <Dialog open={confirmOpen}>
        <DialogContent className="relative max-w-md">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <DialogHeader className="pr-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle className="mt-3">确认删除卡密？</DialogTitle>
            <DialogDescription>{keyMask} 删除后不可继续兑换；如果它预占了文件库存，库存会被释放。</DialogDescription>
          </DialogHeader>

          {remove.error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{remove.error.message}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {remove.isPending ? "删除中" : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
