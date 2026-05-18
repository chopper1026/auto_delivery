import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
        {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
