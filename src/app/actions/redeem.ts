"use server";

import { redirect } from "next/navigation";
import { CardKeyNotRedeemableError, redeemCardKey } from "@/lib/redemption/service";
import { formatCardKeyInput } from "@/lib/card-key-input";
import { getRequestMeta } from "@/lib/request-meta";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export type RedeemState = {
  error?: string;
};

export async function redeemAction(_previousState: RedeemState, formData: FormData): Promise<RedeemState> {
  const cardKey = formatCardKeyInput(String(formData.get("cardKey") ?? ""));
  const meta = await getRequestMeta();

  const limit = await consumeRateLimit({
    scope: "public-redeem",
    identifier: meta.ipAddress,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return { error: "请求过于频繁，请稍后再试。" };
  }

  if (!cardKey) {
    return { error: "请输入卡密。" };
  }

  let receiptToken: string;
  try {
    const redeemed = await redeemCardKey({
      plaintextKey: cardKey,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    receiptToken = redeemed.receiptToken;
  } catch (error) {
    if (error instanceof CardKeyNotRedeemableError) {
      return { error: "卡密无效、已过期或已兑换。" };
    }
    return { error: "兑换失败，请稍后再试。" };
  }

  redirect(`/receipt/${receiptToken}`);
}
