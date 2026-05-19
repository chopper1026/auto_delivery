"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { deleteCardKeyAction } from "@/app/admin/(protected)/cards/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteCardKeyButton({
  cardKeyId,
  csrfToken,
  keyMask,
}: {
  cardKeyId: string;
  csrfToken: string;
  keyMask: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="dangerTonal"
        size="sm"
        className="px-2.5"
        onClick={() => setConfirmOpen(true)}
      >
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
            <DialogDescription>
              {keyMask} 删除后不可继续兑换；如果它预占了文件库存，库存会被释放。
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <form action={deleteCardKeyAction}>
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="cardKeyId" value={cardKeyId} />
              <Button type="submit" variant="destructive">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                确认删除
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
