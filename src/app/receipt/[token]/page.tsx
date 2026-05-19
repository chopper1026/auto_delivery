import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, FileArchive, RotateCcw } from "lucide-react";
import { CopyTextButton } from "@/components/public/copy-text-button";
import { DownloadButton } from "@/components/public/download-button";
import { ReceiptReturnButton } from "@/components/public/receipt-return-button";
import styles from "@/components/public/public-pages.module.css";
import { buttonVariants } from "@/components/ui/button";
import { getReceiptByToken } from "@/lib/redemption/service";
import { cn } from "@/lib/utils";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <main className={cn(styles.publicPage, "min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)]")}>
      <div className={styles.ambientLine} />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">{children}</section>
    </main>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await getReceiptByToken(token);

  if (!receipt) {
    return (
      <PublicPage>
        <article className={cn(styles.receipt, styles.receiptCompact, "px-5 pb-6 pt-7 sm:px-7")}>
          <header className="flex items-start gap-4 border-b border-dashed border-[var(--line)] pb-5">
            <span className={cn(styles.stamp, "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]")}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)]">收货凭证</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">链接无效</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">请确认链接完整，或联系管理员核对兑换记录。</p>
            </div>
          </header>
          <div className={cn(styles.receiptContent, "pt-5")}>
            <Link href="/" className={cn(buttonVariants(), "w-full rounded-[10px] sm:w-auto")}>
              返回兑换页
            </Link>
          </div>
        </article>
      </PublicPage>
    );
  }

  const isText = receipt.kind === "TEXT";

  return (
    <PublicPage>
      <article className={cn(styles.receipt, "px-5 pb-6 pt-7 sm:px-7")}>
        <header className="flex flex-col gap-5 border-b border-dashed border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.16em] text-[var(--primary)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              已兑换
            </p>
            <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{receipt.goodsName}</h1>
            {receipt.kind === "FILE" && receipt.goodsNote ? (
              <p className="mt-3 max-w-2xl rounded-[8px] bg-[var(--primary-soft)] px-3 py-2 text-sm leading-6 text-[var(--primary)]">
                {receipt.goodsNote}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--muted)]">{formatDate(receipt.redeemedAt)}</p>
          </div>
          <span className={cn(styles.stamp, styles.duckStamp, "flex h-12 w-12 shrink-0 items-center justify-center")}>
            <Image
              className={styles.duckIcon}
              src="/icons/xunzhang.svg"
              width={48}
              height={48}
              alt=""
              aria-hidden="true"
              priority
              unoptimized
            />
          </span>
        </header>

        <div className={cn(styles.receiptContent, "space-y-5 pt-5")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-panel)] px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">类型</p>
              <p className="mt-1 text-sm font-semibold">{isText ? "文本货物" : "文件货物"}</p>
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-panel)] px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">状态</p>
              <p className="mt-1 text-sm font-semibold">{receipt.kind === "FILE" && receipt.downloaded ? "已下载" : "可领取"}</p>
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-panel)] px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">{receipt.kind === "FILE" ? "数量" : "凭证"}</p>
              <p className="mt-1 text-sm font-semibold">{receipt.kind === "FILE" ? `${receipt.fileQuantity} 个文件` : "当前链接"}</p>
            </div>
          </div>

          {receipt.kind === "TEXT" ? (
            <section className={cn(styles.textPanel, "rounded-[10px] border border-[var(--line)] p-4")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">文本内容</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">内容仅在当前收货凭证中展示。</p>
                </div>
                <CopyTextButton text={receipt.textContent} />
              </div>
              <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 font-mono text-sm leading-7 text-[var(--ink)]">
                {receipt.textContent}
              </pre>
            </section>
          ) : (
            <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-panel)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary-soft)] text-[var(--primary)]">
                    <FileArchive className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--ink)]">ZIP 文件</h2>
                      <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                        共 {receipt.fileQuantity} 个文件
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {receipt.downloaded ? "此凭证已完成一次成功下载。" : "文件已准备好，每个卡密只能成功下载一次。"}
                    </p>
                  </div>
                </div>
                <DownloadButton token={token} disabled={receipt.downloaded} className="rounded-[10px]" />
              </div>
              {receipt.downloaded ? (
                <p className="mt-4 rounded-[8px] bg-[var(--danger-soft)] px-3 py-2 text-sm leading-6 text-[var(--danger)]">
                  一次性下载保护已生效，当前凭证不能再次下载文件。
                </p>
              ) : null}
            </section>
          )}
        </div>

        <div className="mt-6 flex justify-start">
          {receipt.kind === "FILE" ? (
            <ReceiptReturnButton kind="FILE" token={token} downloaded={receipt.downloaded} className="rounded-[10px]" />
          ) : (
            <ReceiptReturnButton kind="TEXT" className="rounded-[10px]" />
          )}
        </div>

        <footer className={cn(styles.receiptFooter, "mt-9 flex flex-col gap-1 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between")}>
          <span>AutoDelivery</span>
          <span>请妥善保存本页链接</span>
        </footer>
      </article>
    </PublicPage>
  );
}
