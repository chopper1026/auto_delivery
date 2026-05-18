export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--surface-panel)] p-6 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}
