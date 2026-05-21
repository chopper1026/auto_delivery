import type { TegakiBundle } from "tegaki/core";
import { TegakiRenderer } from "tegaki/react";
import { useReducedMotion } from "motion/react";
import parisienne from "../../../../../node_modules/tegaki/dist/fonts/parisienne/bundle.mjs";
import { cn } from "@/lib/utils";
import styles from "./public-pages.module.css";

const BRAND_WORD = "AutoDelivery";
const brandFont = parisienne as unknown as TegakiBundle;
const brandInkWeight = "oklch(0.56 0.15 78 / 0.7)";
const brandGlow = "oklch(0.9 0.11 92 / 0.24)";
const writeEase = (progress: number) => 1 - Math.pow(1 - progress, 2.8);
const strokeEase = (progress: number) => 1 - Math.pow(1 - progress, 3.2);

export function AnimatedBrandWord({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <span className={cn(styles.brandWord, className)} aria-label={BRAND_WORD}>
        {BRAND_WORD}
      </span>
    );
  }

  return (
    <span className={cn(styles.brandWord, styles.brandWrite, className)} aria-label={BRAND_WORD}>
      <TegakiRenderer
        as="span"
        aria-hidden="true"
        className={styles.brandTegaki}
        font={brandFont}
        showOverlay
        time={{
          mode: "uncontrolled",
          delay: 0.28,
          duration: 6.8,
          loop: true,
          loopGap: 2.15,
          easing: writeEase,
        }}
        timing={{
          glyphGap: 0.035,
          wordGap: 0.18,
          deferDots: true,
          strokeEasing: strokeEase,
        }}
        quality={{
          pixelRatio: 1.55,
          segmentSize: 0.95,
          smoothing: true,
        }}
        effects={{
          inkWeight: { effect: "glow", radius: 0.32, color: brandInkWeight, order: -1 },
          glow: { enabled: true, radius: 0.92, color: brandGlow },
          pressureWidth: { enabled: true, strength: 0.26 },
          taper: { enabled: true, startLength: 2.8, endLength: 2.2 },
          wobble: { enabled: true, amplitude: 0.12, frequency: 0.7 },
        }}
      >
        {BRAND_WORD}
      </TegakiRenderer>
    </span>
  );
}
