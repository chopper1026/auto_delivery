"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LockKeyhole, LogIn, PackageCheck, UserRound } from "lucide-react";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import styles from "./login.module.css";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const reduceMotion = useReducedMotion();
  const quick = reduceMotion ? { duration: 0.01 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <main className="admin-login-page relative grid min-h-screen place-items-center overflow-hidden bg-[var(--background)] px-4 py-8 text-[var(--ink)] sm:px-6">
      <div className={cn(styles.background, "absolute inset-0")} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(1_0_0/.52),transparent_34%,oklch(0.9_0.015_105/.16))]" />
      <div className={cn(styles.topLine, "absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]")} />

      <div className={cn(styles.shell, "relative w-full max-w-[408px]")}>
        <section className={cn(styles.card, "overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface)]/97 shadow-[0_30px_92px_-58px_oklch(0.19_0.021_165/.72),inset_0_1px_0_oklch(1_0_0/.55)]")}>
          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="border-b border-[var(--line)] pb-6 text-center">
              <span className={cn(styles.logo, "mx-auto flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--ink)] text-[var(--primary-foreground)] shadow-[0_18px_40px_-28px_oklch(0.2_0.03_145/.85)]")}>
                <PackageCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className={styles.brand}>
                <h1 className="brand-script mt-4 text-[34px] font-bold leading-none text-[var(--primary)]">AutoDelivery</h1>
                <p className="mt-2 text-sm font-semibold text-[var(--muted-strong)]">管理控制台</p>
              </div>
            </div>

            <form action={formAction} className="grid gap-4 pt-6">
              <div className={cn(styles.field, styles.fieldUsername, "space-y-2")}>
                <Label htmlFor="username" className="text-[13px] font-semibold">
                  账号
                </Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    className="h-11 bg-[color-mix(in_oklch,var(--surface)_92%,var(--surface-muted))] pl-10 transition-[border-color,box-shadow,background-color] duration-200"
                  />
                </div>
              </div>

              <div className={cn(styles.field, styles.fieldPassword, "space-y-2")}>
                <Label htmlFor="password" className="text-[13px] font-semibold">
                  密码
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="h-11 bg-[color-mix(in_oklch,var(--surface)_92%,var(--surface-muted))] pl-10 transition-[border-color,box-shadow,background-color] duration-200"
                  />
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {state.error ? (
                  <motion.p
                    className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    transition={quick}
                    role="alert"
                  >
                    {state.error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className={styles.action}>
                <Button type="submit" className="relative mt-1 h-11 w-full overflow-hidden" disabled={pending}>
                  <span className="relative z-10 flex items-center gap-2">
                    {pending ? "正在验证" : "进入控制台"}
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {pending ? (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(90deg,transparent,oklch(0.86_0.18_112/.32),transparent)]"
                      initial={{ x: "-120%" }}
                      animate={{ x: "520%" }}
                      transition={{ duration: reduceMotion ? 0.01 : 1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </Button>
              </div>

              <p className={cn(styles.note, "pt-0.5 text-center text-xs text-[var(--muted)]")}>
                身份验证后进入受保护会话
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
