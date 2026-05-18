"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction, writeAdminAuditLog } from "@/lib/admin/action-auth";
import {
  deleteUnredeemedCardKey,
  generateCardKey,
  NotEnoughInventoryError,
} from "@/lib/card-keys/service";
import type { ExpirationOption } from "@/lib/time";

export type GenerateCardKeyState = {
  plaintextKey?: string;
  keyMask?: string;
  error?: string;
};

export async function generateCardKeyAction(
  _previousState: GenerateCardKeyState,
  formData: FormData,
): Promise<GenerateCardKeyState> {
  const { admin, meta } = await requireAdminAction(formData);
  const goodsId = String(formData.get("goodsId") ?? "");
  const expiration = String(formData.get("expiration") ?? "3d") as ExpirationOption;
  const rawQuantity = Number(formData.get("fileQuantity") ?? 0);

  try {
    const generated = await generateCardKey({
      goodsId,
      expiration,
      fileQuantity: Number.isFinite(rawQuantity) ? rawQuantity : 0,
    });

    await writeAdminAuditLog({
      adminUserId: admin.id,
      action: "card.generate",
      entityType: "CardKey",
      entityId: generated.cardKeyId,
      metadata: { keyMask: generated.keyMask },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/cards");

    return {
      plaintextKey: generated.plaintextKey,
      keyMask: generated.keyMask,
    };
  } catch (error) {
    if (error instanceof NotEnoughInventoryError) {
      return { error: "可用文件库存不足，无法生成卡密。" };
    }
    return { error: "生成失败，请检查货物和数量。" };
  }
}

export async function deleteCardKeyAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const cardKeyId = String(formData.get("cardKeyId") ?? "");

  await deleteUnredeemedCardKey(cardKeyId);
  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "card.delete",
    entityType: "CardKey",
    entityId: cardKeyId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/cards");
  revalidatePath("/admin/goods");
}
