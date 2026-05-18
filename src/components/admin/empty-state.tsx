export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">{message}</div>;
}
