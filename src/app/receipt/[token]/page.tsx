import Link from "next/link";
import { DownloadButton } from "@/components/public/download-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReceiptByToken } from "@/lib/redemption/service";

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await getReceiptByToken(token);

  if (!receipt) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-6 py-16 text-white">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>收货链接无效</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>请确认链接完整，或联系管理员核对兑换记录。</p>
            <Link href="/" className="text-cyan-300 hover:text-cyan-200">
              返回兑换页
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] px-6 py-16 text-white">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Receipt</p>
          <CardTitle className="text-3xl">{receipt.goodsName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-400">
            兑换时间：{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(receipt.redeemedAt)}
          </p>
          {receipt.kind === "TEXT" ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-slate-800 bg-black/30 p-5 text-slate-100">
              {receipt.textContent}
            </pre>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-black/30 p-5">
              <p className="mb-4 text-slate-300">文件货物已打包完成，每个卡密只能成功下载一次。</p>
              <DownloadButton token={token} disabled={receipt.downloaded} />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
