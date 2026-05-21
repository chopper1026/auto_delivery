import { type FormEvent } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GoodsUploadDialog({
  open,
  onOpenChange,
  goodsId,
  goodsName,
  error,
  pending,
  onSubmitFiles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goodsId: string;
  goodsName: string;
  error?: Error | null;
  pending: boolean;
  onSubmitFiles: (files: FileList) => void;
}) {
  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("files") as HTMLInputElement | null;
    if (input?.files?.length) {
      onSubmitFiles(input.files);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="relative max-w-lg">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-label="关闭"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <DialogHeader className="pr-10">
          <DialogTitle>上传库存文件</DialogTitle>
          <DialogDescription>{goodsName}，仅支持 JSON 文件，可一次选择多个。</DialogDescription>
        </DialogHeader>

        {error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error.message}</p> : null}

        <form className="space-y-4" onSubmit={submitUpload}>
          <div className="space-y-2">
            <Label htmlFor={`goods-files-${goodsId}`}>文件</Label>
            <Input id={`goods-files-${goodsId}`} name="files" type="file" accept=".json,application/json" multiple required />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {pending ? "上传中" : "上传文件"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
