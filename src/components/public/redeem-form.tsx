"use client";

import { ArrowRight, Check, KeyRound, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { redeemAction, type RedeemState } from "@/app/actions/redeem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyCardKeyInputData,
  formatCardKeyInput,
  isAllowedCardKeyCompositionInput,
  isAllowedCardKeyInputData,
} from "@/lib/card-key-input";
import { cn } from "@/lib/utils";
import styles from "./public-pages.module.css";

const initialState: RedeemState = { status: "idle" };

export function RedeemForm() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [state, formAction, pending] = useActionState(redeemAction, initialState);
  const [cardKey, setCardKey] = useState("");
  const [localError, setLocalError] = useState<string>();
  const compositionStartValue = useRef<string | null>(null);
  const receiptHref = state.status === "success" ? state.receiptHref : undefined;
  const isSuccess = Boolean(receiptHref);
  const isLocked = pending || isSuccess;
  const error = localError ?? (state.status === "error" ? state.error : undefined);

  useEffect(() => {
    if (!receiptHref) return;

    router.prefetch(receiptHref);
    const timeoutId = window.setTimeout(() => {
      router.replace(receiptHref);
    }, prefersReducedMotion ? 180 : 1450);

    return () => window.clearTimeout(timeoutId);
  }, [prefersReducedMotion, receiptHref, router]);

  function handleBeforeInput(event: FormEvent<HTMLInputElement>) {
    if (isLocked) return;

    const nativeEvent = event.nativeEvent as InputEvent;
    if (!isAllowedCardKeyCompositionInput({ inputType: nativeEvent.inputType, isComposing: nativeEvent.isComposing })) {
      compositionStartValue.current ??= cardKey;
      event.preventDefault();
      restoreCompositionValue(event.currentTarget);
      return;
    }

    if (!isAllowedCardKeyInputData(nativeEvent.data)) event.preventDefault();
  }

  function syncCardKey(value: string) {
    compositionStartValue.current = null;
    const formatted = formatCardKeyInput(value);
    setCardKey(formatted);
    if (formatted) setLocalError(undefined);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (isLocked) return;

    const nativeEvent = event.nativeEvent as InputEvent;
    if (!isAllowedCardKeyCompositionInput({ inputType: nativeEvent.inputType, isComposing: nativeEvent.isComposing })) {
      restoreCompositionValue(event.currentTarget);
      return;
    }

    syncCardKey(event.target.value);
  }

  function restoreCompositionValue(input: HTMLInputElement) {
    const value = compositionStartValue.current ?? cardKey;
    input.value = value;
    setCardKey(value);
  }

  function handleCompositionStart(event: CompositionEvent<HTMLInputElement>) {
    if (isLocked) return;

    compositionStartValue.current = cardKey;
    event.preventDefault();
    restoreCompositionValue(event.currentTarget);
  }

  function handleCompositionInput(event: CompositionEvent<HTMLInputElement>) {
    if (isLocked) return;

    event.preventDefault();
    restoreCompositionValue(event.currentTarget);
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    if (isLocked) return;

    event.preventDefault();
    restoreCompositionValue(event.currentTarget);
    compositionStartValue.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isLocked) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const nativeEvent = event.nativeEvent;
    if (nativeEvent.isComposing || event.key === "Process") {
      compositionStartValue.current ??= cardKey;
      event.preventDefault();
      restoreCompositionValue(event.currentTarget);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (isLocked) return;

    event.preventDefault();
    const nextValue = applyCardKeyInputData({
      value: event.currentTarget.value,
      data: event.clipboardData.getData("text"),
      selectionStart: event.currentTarget.selectionStart,
      selectionEnd: event.currentTarget.selectionEnd,
    });
    compositionStartValue.current = null;
    setCardKey(nextValue);
    if (nextValue) setLocalError(undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isLocked) {
      event.preventDefault();
      return;
    }

    if (formatCardKeyInput(cardKey)) return;

    event.preventDefault();
    setLocalError("请输入卡密。");
  }

  return (
    <form action={formAction} className={cn(styles.formEnter, "space-y-4")} onSubmit={handleSubmit} noValidate>
      <AnimatePresence>
        {isSuccess ? (
          <motion.div
            className={styles.redeemStampLayer}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <motion.span
              className={styles.redeemStampImpact}
              initial={{ opacity: 0, scale: prefersReducedMotion ? 0.98 : 0.68 }}
              animate={{ opacity: prefersReducedMotion ? 0 : [0, 0.42, 0], scale: prefersReducedMotion ? 1 : [0.72, 1.08, 1.32] }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.39, duration: prefersReducedMotion ? 0.01 : 0.46, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className={styles.redeemSuccessStamp}
              initial={{ opacity: prefersReducedMotion ? 0 : 1, y: prefersReducedMotion ? 0 : -280, scale: prefersReducedMotion ? 0.98 : 1.1, rotate: -18 }}
              animate={{
                opacity: 1,
                y: prefersReducedMotion ? 0 : [-280, 18, -7, 0],
                scale: prefersReducedMotion ? 1 : [1.1, 0.86, 1.04, 1],
                rotate: prefersReducedMotion ? -9 : [-18, -8, -10, -9],
              }}
              transition={{
                opacity: { duration: prefersReducedMotion ? 0.12 : 0.01 },
                y: { duration: prefersReducedMotion ? 0.12 : 0.92, times: prefersReducedMotion ? undefined : [0, 0.6, 0.82, 1], ease: [0.16, 1, 0.3, 1] },
                scale: { duration: prefersReducedMotion ? 0.12 : 0.92, times: prefersReducedMotion ? undefined : [0, 0.6, 0.82, 1], ease: [0.16, 1, 0.3, 1] },
                rotate: { duration: prefersReducedMotion ? 0.12 : 0.92, times: prefersReducedMotion ? undefined : [0, 0.6, 0.82, 1], ease: [0.16, 1, 0.3, 1] },
              }}
            >
              <span className={styles.redeemStampPattern} />
              <span className={styles.redeemStampSmall}>兑换</span>
              <span className={styles.redeemStampLarge}>成功</span>
            </motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div>
        <label htmlFor="cardKey" className={cn(styles.redeemText, "mb-2 block text-[15px] font-bold text-[var(--muted-strong)]")}>
          卡密
        </label>
        <div className={styles.inputWrap}>
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <Input
            id="cardKey"
            name="cardKey"
            value={cardKey}
            onBeforeInput={handleBeforeInput}
            onChange={handleChange}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="AD-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            lang="en"
            spellCheck={false}
            disabled={isLocked}
            className={cn(
              styles.cardKeyInput,
              "h-[52px] rounded-[10px] pl-10 font-mono text-base uppercase tracking-[0.12em] shadow-[inset_0_1px_0_oklch(1_0_0/.75)]",
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "cardKey-error" : undefined}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className={cn(styles.redeemButton, "h-12 w-full rounded-[10px]")} disabled={isLocked}>
        {isSuccess ? "兑换成功" : pending ? "校验中" : "确认兑换"}
        {isSuccess ? <Check className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <p className="flex items-center gap-2 text-xs leading-5 text-[var(--muted)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
        一张卡密仅可兑换一次，请妥善保存收货凭证。
      </p>

      <div aria-live="polite">
        {isSuccess ? <p className="sr-only">兑换成功，正在打开收货凭证。</p> : null}
        <AnimatePresence>
          {error ? (
            <motion.p
              id="cardKey-error"
              className={cn(styles.errorMessage, "rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-sm font-medium text-[var(--danger)]")}
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
