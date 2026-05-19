"use client";

import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { redeemAction, type RedeemState } from "@/app/actions/redeem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCardKeyInput } from "@/lib/card-key-input";
import { cn } from "@/lib/utils";
import styles from "./public-pages.module.css";

const initialState: RedeemState = {};

export function RedeemForm() {
  const [state, formAction, pending] = useActionState(redeemAction, initialState);
  const [cardKey, setCardKey] = useState("");

  return (
    <form action={formAction} className={cn(styles.formEnter, "space-y-4")}>
      <div>
        <label htmlFor="cardKey" className="mb-2 block text-sm font-semibold text-[var(--muted-strong)]">
          卡密
        </label>
        <div className={styles.inputWrap}>
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <Input
            id="cardKey"
            name="cardKey"
            value={cardKey}
            onChange={(event) => setCardKey(formatCardKeyInput(event.target.value))}
            placeholder="AD-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            className={cn(
              styles.cardKeyInput,
              "h-[52px] rounded-[10px] pl-10 font-mono text-base uppercase tracking-[0.12em] shadow-[inset_0_1px_0_oklch(1_0_0/.75)]",
            )}
            aria-invalid={Boolean(state.error)}
            required
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="h-12 w-full rounded-[10px]" disabled={pending}>
        {pending ? "校验中" : "确认兑换"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>

      <p className="flex items-center gap-2 text-xs leading-5 text-[var(--muted)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
        一张卡密仅可兑换一次，请妥善保存收货凭证。
      </p>

      <div aria-live="polite">
        <AnimatePresence>
          {state.error ? (
            <motion.p
              className={cn(styles.errorMessage, "rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-sm font-medium text-[var(--danger)]")}
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {state.error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
