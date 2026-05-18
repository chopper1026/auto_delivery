import { ShieldCheck } from "lucide-react";
import { RedeemForm } from "@/components/public/redeem-form";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--ink)]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Auto Delivery</p>
              <h1 className="text-2xl font-semibold tracking-tight">卡密兑换</h1>
            </div>
          </div>
          <RedeemForm />
        </div>
      </section>
    </main>
  );
}
