export type CardKeyDeliveryMessageInput = {
  serviceBaseUrl: string;
  plaintextKey: string;
  createdAt: Date;
  expiresAt: Date | null;
};

const zhDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function normalizeServiceBaseUrl(value: string): string {
  const trimmed = value.trim();
  const url = new URL(trimmed);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Service address must use http or https.");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname === "/" ? "" : pathname}`;
}

export function buildRedeemUrl(serviceBaseUrl: string): string {
  return `${normalizeServiceBaseUrl(serviceBaseUrl)}/`;
}

export function formatDeliveryDate(date: Date | null): string {
  return date ? zhDateTimeFormatter.format(date) : "永不过期";
}

export function buildCardKeyDeliveryMessage(input: CardKeyDeliveryMessageInput): string {
  return [
    `兑换地址：${buildRedeemUrl(input.serviceBaseUrl)}`,
    `卡密：${input.plaintextKey}`,
    `创建时间：${formatDeliveryDate(input.createdAt)}`,
    `到期时间：${formatDeliveryDate(input.expiresAt)}`,
    "",
    "注意事项：",
    "1. 一个卡密只能兑换一次，请勿转发给无关人员。",
    "2. 兑换完成后请及时保存收货页面内容或下载文件。",
    "3. 因个人原因未及时保存导致的损失不予处理。",
  ].join("\n");
}
