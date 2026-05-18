import { PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./admin-enter-transition.module.css";

export function AdminEnterTransition() {
  return (
    <main className={cn(styles.page, "relative min-h-screen overflow-hidden bg-[var(--background)] px-5 text-[var(--ink)]")}>
      <div className={cn(styles.centerLight, "absolute left-1/2 top-1/2 h-[520px] w-[520px] max-w-[120vw] -translate-x-1/2 -translate-y-1/2")} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(1_0_0/.5),transparent_36%,oklch(0.9_0.015_105/.14))]" />
      <div className={cn(styles.topLine, "absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]")} />

      <section className={cn(styles.shell, "relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center py-12 text-center")}>
        <div className={cn(styles.mark, "relative flex h-14 w-14 items-center justify-center rounded-[10px] bg-[var(--ink)] text-[var(--primary-foreground)] shadow-[0_20px_52px_-34px_oklch(0.19_0.021_165/.7)]")}>
          <PackageCheck className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className={cn(styles.brand, "brand-script mt-7 text-[44px] font-bold leading-none text-[var(--primary)] sm:text-5xl")}>
          AutoDelivery
        </p>

        <div className={cn(styles.progress, "mt-7 h-1 w-full max-w-[280px] overflow-hidden rounded-full bg-[var(--primary-soft)]")}>
          <div className={cn(styles.progressFill, "h-full w-full rounded-full bg-[linear-gradient(90deg,var(--primary-hover),var(--primary),oklch(0.56_0.13_150))]")} />
        </div>

        <p className={cn(styles.status, "mt-4 text-xs font-semibold tracking-[0.18em] text-[var(--muted)]")}>
          正在进入管理控制台
        </p>
      </section>
    </main>
  );
}
