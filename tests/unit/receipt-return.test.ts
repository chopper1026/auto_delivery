import { describe, expect, it } from "vitest";
import { getReceiptReturnConfirmation, getReceiptReturnDialog } from "@/lib/receipt-return";

describe("receipt return guard", () => {
  it("does not require confirmation for downloaded file goods", () => {
    expect(getReceiptReturnConfirmation({ kind: "FILE", downloaded: true })).toBeNull();
  });

  it("warns before leaving file goods that have not been downloaded", () => {
    expect(getReceiptReturnConfirmation({ kind: "FILE", downloaded: false })).toContain("还没有下载文件");
  });

  it("always confirms before leaving text goods", () => {
    expect(getReceiptReturnConfirmation({ kind: "TEXT" })).toContain("确认已经保存文本内容");
  });

  it("builds reusable dialog copy for text receipts", () => {
    expect(getReceiptReturnDialog({ kind: "TEXT" })).toEqual({
      title: "返回兑换页？",
      description: "请确认已经保存文本内容。返回后如果需要再次查看，请使用当前收货链接。",
      confirmLabel: "确认返回",
      cancelLabel: "继续查看",
      tone: "warning",
    });
  });

  it("does not build dialog copy for downloaded file receipts", () => {
    expect(getReceiptReturnDialog({ kind: "FILE", downloaded: true })).toBeNull();
  });
});
