import type { CardKeyStatus, DownloadResult, GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";

export function formatGoodsType(type: GoodsType): string {
  return type === "TEXT" ? "文本" : "文件";
}

export function formatGoodsStatus(status: GoodsStatus): string {
  return status === "ACTIVE" ? "启用" : "停用";
}

export function formatGoodsFileStatus(status: GoodsFileStatus): string {
  const labels: Record<GoodsFileStatus, string> = {
    AVAILABLE: "可用",
    RESERVED: "预占",
    REDEEMED: "已兑换",
    DELETED: "已删除",
  };
  return labels[status];
}

export function formatCardKeyStatus(status: CardKeyStatus): string {
  const labels: Record<CardKeyStatus, string> = {
    ACTIVE: "可兑换",
    REDEEMED: "已兑换",
    EXPIRED: "已过期",
    DELETED: "已删除",
  };
  return labels[status];
}

export function formatDownloadResult(result: DownloadResult): string {
  const labels: Record<DownloadResult, string> = {
    SUCCESS: "成功",
    ALREADY_DOWNLOADED: "重复下载",
    NOT_FOUND: "链接无效",
    ERROR: "异常",
  };
  return labels[result];
}
