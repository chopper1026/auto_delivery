import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/action-auth";
import { getGoodsFileExportPackage, type GoodsFileExportScope } from "@/lib/goods/service";
import { getRequestMeta } from "@/lib/request-meta";
import { ensureStorageDirectories, sanitizeZipEntryName } from "@/lib/storage/files";
import { tmpRoot } from "@/lib/storage/paths";
import { createZipFromFiles } from "@/lib/storage/zip";

export const dynamic = "force-dynamic";

function parseScope(scope: string): GoodsFileExportScope | null {
  if (scope === "unredeemed") return "UNREDEEMED";
  if (scope === "redeemed") return "REDEEMED";
  return null;
}

function formatDateSegment(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createExportFilename(goodsName: string, scope: GoodsFileExportScope) {
  const scopeLabel = scope === "UNREDEEMED" ? "未兑换" : "已兑换";
  return `${sanitizeZipEntryName(`${goodsName}-${scopeLabel}-${formatDateSegment(new Date())}`)}.zip`;
}

function createEmptyExportMessage(scope: GoodsFileExportScope) {
  return scope === "UNREDEEMED" ? "没有未兑换文件可导出。" : "没有已兑换文件可导出。";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ goodsId: string; scope: string }> }) {
  const { admin } = await requireAdminSession();
  const { goodsId, scope: rawScope } = await params;
  const scope = parseScope(rawScope);

  if (!scope) {
    return new Response("Unsupported export scope", { status: 400 });
  }

  const exportPackage = await getGoodsFileExportPackage(goodsId, scope);
  if (!exportPackage) {
    return new Response("File goods not found", { status: 404 });
  }

  if (exportPackage.entries.length === 0) {
    return new Response(createEmptyExportMessage(scope), { status: 409 });
  }

  await ensureStorageDirectories();
  const zipPath = path.join(tmpRoot, `goods-export-${crypto.randomUUID()}.zip`);
  await createZipFromFiles(
    exportPackage.entries.map((entry) => ({
      path: entry.storagePath,
      entryName: entry.entryName,
    })),
    zipPath,
    [{ entryName: "manifest.csv", content: exportPackage.manifestCsv }],
  );

  const meta = await getRequestMeta();
  await writeAdminAuditLog({
    adminUserId: admin.id,
    action: scope === "UNREDEEMED" ? "goods.export_unredeemed" : "goods.export_redeemed",
    entityType: "Goods",
    entityId: goodsId,
    metadata: { count: exportPackage.entries.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const filename = createExportFilename(exportPackage.goodsName, scope);
  const encodedFilename = encodeURIComponent(filename);
  const stream = fs.createReadStream(zipPath);
  stream.on("close", () => {
    void fsp.rm(zipPath, { force: true });
  });

  return new Response(Readable.toWeb(stream) as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
