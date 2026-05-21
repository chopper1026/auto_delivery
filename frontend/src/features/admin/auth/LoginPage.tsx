import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LockKeyhole, LogIn, PackageCheck, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/api/admin";
import { setCsrfToken } from "@/api/client";
import { AnimatedBrandWord } from "@/components/brand/AnimatedBrandWord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import styles from "./login.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const quick = reduceMotion ? { duration: 0.01 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };
  const login = useMutation({
    mutationFn: () => adminApi.login(username, password),
    onSuccess: (session) => {
      setCsrfToken(session.csrfToken);
      navigate("/admin", { replace: true });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

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
                <h1 className={cn(styles.brandHeading, "flex justify-center text-[34px] font-bold leading-none text-[var(--primary)]")}>
                  <AnimatedBrandWord className={cn(styles.brandWord, "brand-script")} />
                </h1>
                <p className="mt-2 text-sm font-semibold text-[var(--muted-strong)]">管理控制台</p>
              </div>
            </div>

            <form className="grid gap-4 pt-6" onSubmit={submit}>
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
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={cn(styles.iconInput, "h-11 bg-[color-mix(in_oklch,var(--surface)_92%,var(--surface-muted))] transition-[border-color,box-shadow,background-color] duration-200")}
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={cn(styles.iconInput, "h-11 bg-[color-mix(in_oklch,var(--surface)_92%,var(--surface-muted))] transition-[border-color,box-shadow,background-color] duration-200")}
                  />
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {login.error ? (
                  <motion.p
                    className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    transition={quick}
                    role="alert"
                  >
                    {login.error.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className={styles.action}>
                <Button type="submit" className="relative mt-1 h-11 w-full overflow-hidden" disabled={login.isPending || !username || !password}>
                  <span className="relative z-10 flex items-center gap-2">
                    {login.isPending ? "正在验证" : "进入控制台"}
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {login.isPending ? (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-1/4 bg-[linear-gradient(90deg,transparent,oklch(0.86_0.18_112/.32),transparent)]"
                      initial={{ x: "-120%" }}
                      animate={{ x: "520%" }}
                      transition={{ duration: reduceMotion ? 0.01 : 1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </Button>
              </div>

              <p className={cn(styles.note, "pt-0.5 text-center text-xs text-[var(--muted)]")}>身份验证后进入受保护会话</p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
