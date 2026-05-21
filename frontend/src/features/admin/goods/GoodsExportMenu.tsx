import { Archive, ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const exportMenuWidth = 192;
const exportMenuHeight = 92;

export function GoodsExportMenu({
  goodsId,
  unredeemedCount,
  redeemedCount,
}: {
  goodsId: string;
  unredeemedCount: number;
  redeemedCount: number;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const hasExportableFiles = unredeemedCount > 0 || redeemedCount > 0;

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
  );
}
