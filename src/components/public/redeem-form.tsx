"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemAction, type RedeemState } from "@/app/actions/redeem";

const initialState: RedeemState = {};

export function RedeemForm() {
  const [state, formAction, pending] = useActionState(redeemAction, initialState);

  return (
    <form action={formAction} className="pt-5">
      <label htmlFor="cardKey" className="mb-2 block text-sm font-medium text-[var(--muted-strong)]">
        卡密
      </label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <Input
          id="cardKey"
          name="cardKey"
          placeholder="AD-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="h-12 pl-10 font-mono text-base uppercase tracking-[0.12em]"
          required
        />
      </div>
      <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending}>
        {pending ? "兑换中" : "兑换"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <AnimatePresence>
        {state.error ? (
          <motion.p
            className="mt-3 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {state.error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
