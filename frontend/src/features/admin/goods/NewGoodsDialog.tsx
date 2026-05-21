import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, FileText, PackagePlus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { api } from "@/api";
import type { GoodsType } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewGoodsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goodsType, setGoodsType] = useState<GoodsType>("TEXT");
  const create = useMutation({
    mutationFn: api.createGoods,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods"] });
      setOpen(false);
    },
  });

  function submitTextGoods(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      name: String(form.get("name") ?? ""),
      type: "TEXT",
      textContent: String(form.get("textContent") ?? ""),
    });
  }

  function submitFileGoods(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      name: String(form.get("name") ?? ""),
      type: "FILE",
      note: String(form.get("note") ?? ""),
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" aria-hidden="true" />
        新增货物
      </Button>

      <Dialog open={open}>
        <DialogContent className="relative max-w-xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <DialogHeader className="pr-10">
            <DialogTitle>新增货物</DialogTitle>
            <DialogDescription>选择货物类型后填写必要信息。</DialogDescription>
          </DialogHeader>

          <div className="mb-4 space-y-2">
            <Label>货物类型</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                onClick={() => setGoodsType("TEXT")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                  goodsType === "TEXT" ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)]" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"
                }`}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                文本
              </button>
              <button
                type="button"
                onClick={() => setGoodsType("FILE")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                  goodsType === "FILE" ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)]" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"
                }`}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                文件
              </button>
            </div>
          </div>

          {create.error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{create.error.message}</p> : null}

          {goodsType === "TEXT" ? (
            <form className="space-y-4" onSubmit={submitTextGoods}>
              <div className="space-y-2">
                <Label htmlFor="new-text-goods-name">名称</Label>
                <Input id="new-text-goods-name" name="name" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-text-goods-content">内容</Label>
                <Textarea id="new-text-goods-content" name="textContent" required />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {create.isPending ? "添加中" : "添加文本货物"}
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitFileGoods}>
              <div className="space-y-2">
                <Label htmlFor="new-file-goods-name">名称</Label>
                <Input id="new-file-goods-name" name="name" placeholder="例如：CPA 文件" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-file-goods-note">备注</Label>
                <Textarea id="new-file-goods-note" name="note" placeholder="例如：下载后请先解压，再导入工具。" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  {create.isPending ? "创建中" : "创建文件货物"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
