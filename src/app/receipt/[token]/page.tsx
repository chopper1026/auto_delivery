import Link from "next/link";
import { CheckCircle2, FileArchive, FileText, RotateCcw } from "lucide-react";
import { DownloadButton } from "@/components/public/download-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReceiptByToken } from "@/lib/redemption/service";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await getReceiptByToken(token);

  if (!receipt) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--ink)]">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
          <Card>
            <CardHeader>
              <CardTitle>收货链接无效</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-[var(--muted-strong)]">请确认链接完整，或联系管理员核对兑换记录。</p>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                返回兑换页
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const isText = receipt.kind === "TEXT";

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--ink)]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                {isText ? <FileText className="h-5 w-5" aria-hidden="true" /> : <FileArchive className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  已兑换
                </p>
                <CardTitle className="mt-1 text-2xl">{receipt.goodsName}</CardTitle>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(receipt.redeemedAt)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {receipt.kind === "TEXT" ? (
              <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-4 text-sm leading-6 text-[var(--ink)]">
                {receipt.textContent}
              </pre>
            ) : (
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--ink)]">ZIP 文件已准备好</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">每个卡密只能成功下载一次。</p>
                  </div>
                </div>
                <DownloadButton token={token} disabled={receipt.downloaded} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
