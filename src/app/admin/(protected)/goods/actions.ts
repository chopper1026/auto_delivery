"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction, writeAdminAuditLog } from "@/lib/admin/action-auth";
import { createFileGoods, createTextGoods, disableGoods, enableGoods, registerGoodsFiles } from "@/lib/goods/service";
import { isAllowedInventoryFile, writeUploadedFile } from "@/lib/storage/files";

export async function createTextGoodsAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const goods = await createTextGoods({
    name: String(formData.get("name") ?? ""),
    textContent: String(formData.get("textContent") ?? ""),
  });

  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "goods.create_text",
    entityType: "Goods",
    entityId: goods.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/goods");
}

export async function createFileGoodsAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const goods = await createFileGoods({ name: String(formData.get("name") ?? "") });

  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "goods.create_file",
    entityType: "Goods",
    entityId: goods.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/goods");
}

export async function uploadGoodsFilesAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const goodsId = String(formData.get("goodsId") ?? "");
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    throw new Error("No files selected.");
  }

  const saved = [];
  for (const file of files) {
    if (!isAllowedInventoryFile(file.name, file.type)) {
      throw new Error("Only JSON files are allowed.");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    saved.push({
      originalName: file.name,
      mimeType: file.type || "application/json",
      ...(await writeUploadedFile({ goodsId, originalName: file.name, bytes })),
    });
  }

  await registerGoodsFiles(goodsId, saved);
  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "goods.upload_files",
    entityType: "Goods",
    entityId: goodsId,
    metadata: { count: saved.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/goods");
}

export async function disableGoodsAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const goodsId = String(formData.get("goodsId") ?? "");

  await disableGoods(goodsId);
  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "goods.disable",
    entityType: "Goods",
    entityId: goodsId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/goods");
}

export async function enableGoodsAction(formData: FormData): Promise<void> {
  const { admin, meta } = await requireAdminAction(formData);
  const goodsId = String(formData.get("goodsId") ?? "");

  await enableGoods(goodsId);
  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: "goods.enable",
    entityType: "Goods",
    entityId: goodsId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  revalidatePath("/admin/goods");
}
