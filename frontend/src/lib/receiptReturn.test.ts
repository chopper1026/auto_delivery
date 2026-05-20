import { describe, expect, it } from "vitest";
import { getReceiptReturnDialog } from "./receiptReturn";

describe("receipt return dialog", () => {
  it("asks text-goods users to save content before returning", () => {
    expect(getReceiptReturnDialog({ kind: "TEXT" })?.title).toBe("返回兑换页？");
  });

  it("warns file-goods users when file has not been downloaded", () => {
    expect(getReceiptReturnDialog({ kind: "FILE", downloaded: false })?.title).toBe("文件还没有下载");
  });

  it("does not warn after file download is completed", () => {
    expect(getReceiptReturnDialog({ kind: "FILE", downloaded: true })).toBeNull();
  });
});
