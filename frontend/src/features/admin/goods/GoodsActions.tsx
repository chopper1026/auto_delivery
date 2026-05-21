import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ChevronDown, CirclePlay, Download, Info, PauseCircle, Trash2, Upload, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/api";
import { buildGoodsDetailSections } from "@/lib/admin/goodsTableUi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InventoryCounts = {
  available: number;
  reserved: number;
  redeemed: number;
};

type UsageCounts = {
  cardKeys: number;
  redemptions: number;
};

const exportMenuWidth = 192;
const exportMenuHeight = 92;

export function GoodsActions({
  goodsId,
  goodsName,
  goodsType,
  goodsNote,
  textContent,
  inventory,
  usage,
  status,
}: {
  goodsId: string;
  goodsName: string;
  goodsType: "TEXT" | "FILE";
  goodsNote?: string | null;
  textContent?: string | null;
  inventory: InventoryCounts;
  usage: UsageCounts;
  status: "ACTIVE" | "DISABLED";
}) {
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const isFileGoods = goodsType === "FILE";
  const unredeemedCount = inventory.available + inventory.reserved;
  const redeemedCount = inventory.redeemed;
  const hasExportableFiles = unredeemedCount > 0 || redeemedCount > 0;
  const canDelete = usage.cardKeys === 0 && usage.redemptions === 0;
  const detailSections = buildGoodsDetailSections({ type: goodsType, note: goodsNote ?? null, textContent: textContent ?? null });

  const toggleStatus = useMutation({
    mutationFn: (nextStatus: "ACTIVE" | "DISABLED") => api.updateGoods(goodsId, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goods"] }),
  });
  const uploadFiles = useMutation({
    mutationFn: (files: FileList) => api.uploadFiles(goodsId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods"] });
      setUploadOpen(false);
    },
  });
  const deleteGoods = useMutation({
    mutationFn: () => api.deleteGoods(goodsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods"] });
      setDeleteOpen(false);
    },
  });

  function getExportMenuPosition() {
    const rect = exportButtonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const gutter = 12;
    const width = Math.min(exportMenuWidth, window.innerWidth - gutter * 2);
    const left = Math.min(Math.max(gutter, rect.right - width), Math.max(gutter, window.innerWidth - width - gutter));
    const belowTop = rect.bottom + 8;
    const top = belowTop + exportMenuHeight > window.innerHeight - gutter ? Math.max(gutter, rect.top - exportMenuHeight - 8) : belowTop;

    return { top, left, width };
  }

  function toggleExportMenu() {
    if (exportOpen) {
      setExportOpen(false);
      return;
    }

    const position = getExportMenuPosition();
    if (!position) return;

    setExportMenuPosition(position);
    setExportOpen(true);
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("files") as HTMLInputElement | null;
    if (input?.files?.length) {
      uploadFiles.mutate(input.files);
    }
  }

  useEffect(() => {
    if (!exportOpen) return;

    function updateExportMenuPosition() {
      const position = getExportMenuPosition();
      if (position) setExportMenuPosition(position);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!exportButtonRef.current?.contains(target) && !exportMenuRef.current?.contains(target)) {
        setExportOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExportOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateExportMenuPosition);
    window.addEventListener("scroll", updateExportMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateExportMenuPosition);
      window.removeEventListener("scroll", updateExportMenuPosition, true);
    };
  }, [exportOpen]);

  function renderExportItem(scope: "unredeemed" | "redeemed", label: string, count: number) {
    const Icon = scope === "unredeemed" ? Download : Archive;
    const className = "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition";
    const content = (
      <>
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 font-semibold text-[var(--muted-strong)]">{count}</span>
      </>
    );

    if (count <= 0) {
      return (
        <span key={scope} role="menuitem" aria-disabled="true" className={cn(className, "cursor-not-allowed text-[var(--muted)] opacity-65")} title="当前没有可导出的文件">
          {content}
        </span>
      );
    }

    return (
      <a
        key={scope}
        href={`/api/admin/goods/${encodeURIComponent(goodsId)}/export/${scope === "unredeemed" ? "UNREDEEMED" : "REDEEMED"}`}
        role="menuitem"
        className={cn(className, "text-[var(--ink)] hover:bg-[var(--surface-muted)]")}
        onClick={() => setExportOpen(false)}
      >
        {content}
      </a>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          详情
        </Button>

        {isFileGoods ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              上传
            </Button>
            <div ref={exportButtonRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleExportMenu}
                disabled={!hasExportableFiles}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                title={hasExportableFiles ? "导出文件" : "没有文件可导出"}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                导出文件
                <ChevronDown className={cn("h-3 w-3 transition-transform", exportOpen ? "rotate-180" : "")} aria-hidden="true" />
              </Button>
            </div>
            {exportOpen && exportMenuPosition && typeof document !== "undefined"
              ? createPortal(
                  <div
                    ref={exportMenuRef}
                    role="menu"
                    style={{
                      top: exportMenuPosition.top,
                      left: exportMenuPosition.left,
                      width: exportMenuPosition.width,
                    }}
                    className="fixed z-50 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]"
                  >
                    {renderExportItem("unredeemed", "未兑换文件", unredeemedCount)}
                    {renderExportItem("redeemed", "已兑换文件", redeemedCount)}
                  </div>,
                  document.body,
                )
              : null}
          </>
        ) : null}

        <Button
          type="button"
          variant={status === "ACTIVE" ? "warningTonal" : "successTonal"}
          size="sm"
          disabled={toggleStatus.isPending}
          onClick={() => toggleStatus.mutate(status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
        >
          {status === "ACTIVE" ? <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" /> : <CirclePlay className="h-3.5 w-3.5" aria-hidden="true" />}
          {status === "ACTIVE" ? "停用" : "启用"}
        </Button>

        <Button
          type="button"
          variant="dangerTonal"
          size="sm"
          disabled={!canDelete}
          title={canDelete ? "删除货物" : "已有卡密或兑换记录，不能删除，请停用"}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          删除
        </Button>
      </div>

      <Dialog open={detailOpen}>
        <DialogContent className="relative max-w-2xl">
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
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

      <Dialog open={uploadOpen}>
        <DialogContent className="relative max-w-lg">
          <button
            type="button"
            onClick={() => setUploadOpen(false)}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <DialogHeader className="pr-10">
            <DialogTitle>上传库存文件</DialogTitle>
            <DialogDescription>{goodsName}，仅支持 JSON 文件，可一次选择多个。</DialogDescription>
          </DialogHeader>

          {uploadFiles.error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{uploadFiles.error.message}</p> : null}

          <form className="space-y-4" onSubmit={submitUpload}>
            <div className="space-y-2">
              <Label htmlFor={`goods-files-${goodsId}`}>文件</Label>
              <Input id={`goods-files-${goodsId}`} name="files" type="file" accept=".json,application/json" multiple required />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={uploadFiles.isPending}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                {uploadFiles.isPending ? "上传中" : "上传文件"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen}>
        <DialogContent className="relative max-w-md">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
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

          {deleteGoods.error ? <p className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{deleteGoods.error.message}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="destructive" disabled={deleteGoods.isPending} onClick={() => deleteGoods.mutate()}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {deleteGoods.isPending ? "删除中" : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
