import { AnimatedBrandWord } from "@/features/public/shared/AnimatedBrandWord";
import { RedeemForm } from "./RedeemForm";
import { cn } from "@/lib/utils";
import styles from "@/features/public/shared/public-pages.module.css";

const voucherToothCount = 40;
const voucherToothStep = 100 / (voucherToothCount * 2);
const voucherEdgePoints = Array.from({ length: voucherToothCount * 2 + 1 }, (_, index) => {
  const isOuterPoint = index % 2 === 1;
  return {
    x: Number((index * voucherToothStep).toFixed(2)),
    topY: isOuterPoint ? 1.5 : 8,
    bottomY: isOuterPoint ? 498.5 : 492,
    bottomInset: isOuterPoint ? 1.5 : 8,
  };
});

function formatEdgeX(value: number) {
  if (value === 0) return "0";
  if (value === 100) return "100%";
  return `${value}%`;
}

const voucherPaperEdgePath = [
  ...voucherEdgePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.topY}`),
  "L 100 492",
  ...voucherEdgePoints
    .slice(0, -1)
    .reverse()
    .map((point) => `L ${point.x} ${point.bottomY}`),
  "Z",
].join(" ");

const voucherPaperEdgeClipPath = `polygon(${[
  ...voucherEdgePoints.map((point) => `${formatEdgeX(point.x)} ${point.topY}px`),
  "100% calc(100% - 8px)",
  ...voucherEdgePoints
    .slice(0, -1)
    .reverse()
    .map((point) => `${formatEdgeX(point.x)} calc(100% - ${point.bottomInset}px)`),
].join(", ")})`;

export function RedeemPage() {
  return (
    <main className={cn(styles.publicPage, "min-h-screen overflow-hidden px-5 py-8 text-[var(--ink)]")}>
      <div className={styles.ambientLine} />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div
          className={cn(styles.voucher, "flex min-h-[500px] flex-col px-5 pb-8 pt-11 sm:min-h-[520px] sm:px-6 sm:pb-9 sm:pt-12")}
          style={{ clipPath: voucherPaperEdgeClipPath }}
        >
          <svg className={styles.voucherOutline} viewBox="0 0 100 500" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path vectorEffect="non-scaling-stroke" d={voucherPaperEdgePath} />
            <path vectorEffect="non-scaling-stroke" d={voucherPaperEdgePath} />
          </svg>
          <div className="mb-7 flex items-start justify-between gap-5 border-b border-dashed border-[var(--line)] pb-6">
            <div className="min-w-0">
              <AnimatedBrandWord className={cn(styles.brandWarm, "brand-script text-[34px] font-extrabold leading-none")} />
              <h1 className={cn(styles.redeemTitle, "mt-4 text-[32px] font-normal leading-none tracking-tight text-[var(--ink)]")}>卡密兑换</h1>
            </div>
            <span className={cn(styles.stamp, styles.duckStamp, "flex h-12 w-12 shrink-0 items-center justify-center")}>
              <img className={styles.duckIcon} src="/icons/xunzhang.svg" width={48} height={48} alt="" aria-hidden="true" />
            </span>
          </div>
          <RedeemForm />
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-dashed border-[var(--line)] pt-5 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
            <span>ONE-TIME DELIVERY</span>
            <span>SECURE RECEIPT</span>
          </div>
        </div>
      </section>
    </main>
  );
}
