import { describe, expect, it } from "vitest";
import { formatCardKeyStatus, formatDownloadResult, formatGoodsFileStatus, formatGoodsStatus, formatGoodsType } from "./displayLabels";

describe("display labels", () => {
  it("formats goods labels", () => {
    expect(formatGoodsType("TEXT")).toBe("文本");
    expect(formatGoodsType("FILE")).toBe("文件");
    expect(formatGoodsStatus("ACTIVE")).toBe("启用");
    expect(formatGoodsStatus("DISABLED")).toBe("停用");
  });

  it("formats card-key and download statuses", () => {
    expect(formatCardKeyStatus("ACTIVE")).toBe("可兑换");
    expect(formatCardKeyStatus("REDEEMED")).toBe("已兑换");
    expect(formatCardKeyStatus("EXPIRED")).toBe("已过期");
    expect(formatCardKeyStatus("DELETED")).toBe("已删除");
    expect(formatDownloadResult("SUCCESS")).toBe("成功");
    expect(formatDownloadResult("ALREADY_DOWNLOADED")).toBe("重复下载");
    expect(formatDownloadResult("NOT_FOUND")).toBe("链接无效");
    expect(formatDownloadResult("ERROR")).toBe("异常");
  });

  it("formats file inventory statuses", () => {
    expect(formatGoodsFileStatus("AVAILABLE")).toBe("可用");
    expect(formatGoodsFileStatus("RESERVED")).toBe("预占");
    expect(formatGoodsFileStatus("REDEEMED")).toBe("已兑换");
    expect(formatGoodsFileStatus("DELETED")).toBe("已删除");
  });
});
