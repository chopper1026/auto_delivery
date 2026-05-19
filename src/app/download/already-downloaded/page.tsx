import Link from "next/link";
import { FileX2, Home, RotateCcw, ShieldCheck } from "lucide-react";
import styles from "@/components/public/public-pages.module.css";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AlreadyDownloadedPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { receipt } = await searchParams;
  const receiptHref = receipt ? `/receipt/${encodeURIComponent(receipt)}` : null;

  return (
    <main className={cn(styles.publicPage, "min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)]")}>
      <div className={styles.ambientLine} />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <article className={cn(styles.receipt, "px-5 pb-6 pt-7 sm:px-7")}>
          <header className="flex items-start gap-4 border-b border-dashed border-[var(--line)] pb-5">
            <span className={cn(styles.stamp, "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]")}>
              <FileX2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.16em] text-[var(--primary)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                一次性下载保护
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">文件已下载过</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">这个卡密关联的文件只能成功下载一次。</p>
            </div>
          </header>

          <div className={cn(styles.receiptContent, "space-y-5 pt-5")}>
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-panel)] p-4">
              <p className="text-sm leading-6 text-[var(--muted-strong)]">
                系统已经记录过成功下载。为避免重复交付，当前链接不能再次下载文件。
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">如果你没有拿到文件，请联系发卡方或管理员核对下载记录。</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {receiptHref ? (
                <Link href={receiptHref} className={cn(buttonVariants({ variant: "outline" }), "w-full rounded-[10px] sm:w-auto")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  查看收货页
                </Link>
              ) : null}
              <Link href="/" className={cn(buttonVariants(), "w-full rounded-[10px] sm:w-auto")}>
                <Home className="h-4 w-4" aria-hidden="true" />
                返回兑换页
              </Link>
            </div>
          </div>

          <footer className={cn(styles.receiptFooter, "mt-9 flex items-center justify-between pt-5 text-xs")}>
            <span>AutoDelivery</span>
            <span>ONE-TIME DOWNLOAD</span>
          </footer>
        </article>
      </section>
    </main>
  );
}
