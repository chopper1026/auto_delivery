import Link from "next/link";
import { FileX2, Home, RotateCcw, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function AlreadyDownloadedPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { receipt } = await searchParams;
  const receiptHref = receipt ? `/receipt/${encodeURIComponent(receipt)}` : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--ink)]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
                <FileX2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  一次性下载保护
                </p>
                <CardTitle className="mt-1 text-2xl">文件已下载过</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-4">
              <p className="text-sm leading-6 text-[var(--muted-strong)]">
                这个卡密关联的文件只能成功下载一次。系统已经记录过下载，为避免重复交付，当前链接不能再次下载。
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">如果你没有拿到文件，请联系发卡方或管理员核对下载记录。</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {receiptHref ? (
                <Link href={receiptHref} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  查看收货页
                </Link>
              ) : null}
              <Link href="/" className={cn(buttonVariants(), "w-full sm:w-auto")}>
                <Home className="h-4 w-4" aria-hidden="true" />
                返回兑换页
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
