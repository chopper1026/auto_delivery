import { Pencil, Save, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildGoodsDetailSections } from "@/lib/admin/goodsTableUi";
import { cn } from "@/lib/utils";
import type { UpdateGoodsInput } from "@/types/shared";

export function GoodsDetailDialog({
  open,
  onOpenChange,
  goodsName,
  goodsType,
  goodsNote = "",
  textContent = "",
  error,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goodsName: string;
  goodsType: "TEXT" | "FILE";
  goodsNote?: string | null;
  textContent?: string | null;
  error?: Error | null;
  pending: boolean;
  onSubmit: (input: UpdateGoodsInput) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goodsName);
  const [note, setNote] = useState(goodsNote ?? "");
  const [content, setContent] = useState(textContent ?? "");
  const detailSections = buildGoodsDetailSections({ type: goodsType, note: goodsNote ?? null, textContent: textContent ?? null });

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setName(goodsName);
    setNote(goodsNote ?? "");
    setContent(textContent ?? "");
  }, [goodsName, goodsNote, open, textContent]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name,
      note,
      ...(goodsType === "TEXT" ? { textContent: content } : {}),
    });
  }

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

        {editing ? (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="goods-detail-name">名称</Label>
              <Input id="goods-detail-name" name="name" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            {goodsType === "TEXT" ? (
              <div className="space-y-2">
                <Label htmlFor="goods-detail-text-content">文本内容</Label>
                <Textarea
                  id="goods-detail-text-content"
                  name="textContent"
                  required
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-48 font-mono text-sm leading-6"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="goods-detail-note">备注</Label>
              <Textarea id="goods-detail-note" name="note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            {error ? <p className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error.message}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {pending ? "保存中" : "保存详情"}
              </Button>
            </div>
          </form>
        ) : (
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
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(true)} aria-label="编辑货物">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                编辑
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
