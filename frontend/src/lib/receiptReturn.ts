export type ReceiptReturnState =
  | { kind: "TEXT"; downloaded?: boolean }
  | { kind: "FILE"; downloaded: boolean };

export type ReceiptReturnDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "warning";
};

export function getReceiptReturnDialog(receipt: ReceiptReturnState): ReceiptReturnDialog | null {
  if (receipt.kind === "TEXT") {
    return {
      title: "返回兑换页？",
      description: "请确认已经保存文本内容。返回后如果需要再次查看，请使用当前收货链接。",
      confirmLabel: "确认返回",
      cancelLabel: "继续查看",
      tone: "warning",
    };
  }

  if (receipt.downloaded) return null;

  return {
    title: "文件还没有下载",
    description: "每个卡密只能成功下载一次。确认返回兑换页后，请确保不再需要当前下载入口。",
    confirmLabel: "确认返回",
    cancelLabel: "继续下载",
    tone: "warning",
  };
}
