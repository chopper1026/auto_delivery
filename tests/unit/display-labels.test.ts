import { describe, expect, it } from "vitest";
import { CardKeyStatus, DownloadResult, GoodsFileStatus, GoodsStatus, GoodsType } from "@/generated/prisma/enums";
import {
  formatCardKeyStatus,
  formatDownloadResult,
  formatGoodsFileStatus,
  formatGoodsStatus,
  formatGoodsType,
} from "@/lib/display-labels";

describe("display labels", () => {
  it("formats goods labels for the admin UI", () => {
    expect(formatGoodsType(GoodsType.TEXT)).toBe("文本");
    expect(formatGoodsType(GoodsType.FILE)).toBe("文件");
    expect(formatGoodsStatus(GoodsStatus.ACTIVE)).toBe("启用");
    expect(formatGoodsStatus(GoodsStatus.DISABLED)).toBe("停用");
  });

  it("formats card-key statuses without exposing raw enums", () => {
    expect(formatCardKeyStatus(CardKeyStatus.ACTIVE)).toBe("可兑换");
    expect(formatCardKeyStatus(CardKeyStatus.REDEEMED)).toBe("已兑换");
    expect(formatCardKeyStatus(CardKeyStatus.EXPIRED)).toBe("已过期");
    expect(formatCardKeyStatus(CardKeyStatus.DELETED)).toBe("已删除");
  });

  it("formats inventory and download results for scanning", () => {
    expect(formatGoodsFileStatus(GoodsFileStatus.AVAILABLE)).toBe("可用");
    expect(formatGoodsFileStatus(GoodsFileStatus.RESERVED)).toBe("预占");
    expect(formatGoodsFileStatus(GoodsFileStatus.REDEEMED)).toBe("已兑换");
    expect(formatGoodsFileStatus(GoodsFileStatus.DELETED)).toBe("已删除");
    expect(formatDownloadResult(DownloadResult.SUCCESS)).toBe("成功");
    expect(formatDownloadResult(DownloadResult.ALREADY_DOWNLOADED)).toBe("重复下载");
    expect(formatDownloadResult(DownloadResult.NOT_FOUND)).toBe("链接无效");
    expect(formatDownloadResult(DownloadResult.ERROR)).toBe("异常");
  });
});
