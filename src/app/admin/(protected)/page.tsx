import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.36em] text-cyan-300">Overview</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">概览</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>系统已启动</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400">后续任务会接入真实统计、货物、卡密和日志数据。</CardContent>
      </Card>
    </div>
  );
}
