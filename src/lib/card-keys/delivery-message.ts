export type CardKeyDeliveryMessageInput = {
  serviceBaseUrl: string;
  plaintextKey: string;
  createdAt: Date;
  expiresAt: Date | null;
  template?: string;
};

const zhDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE = [
  "兑换地址：{{redeemUrl}}",
  "卡密：{{cardKey}}",
  "创建时间：{{createdAt}}",
  "到期时间：{{expiresAt}}",
  "",
  "注意事项：",
  "1. 一个卡密只能兑换一次，请勿转发给无关人员。",
  "2. 兑换完成后请及时保存收货页面内容或下载文件。",
  "3. 因个人原因未及时保存导致的损失不予处理。",
].join("\n");

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
  const template = input.template?.trim() || DEFAULT_CARD_KEY_DELIVERY_MESSAGE_TEMPLATE;
  const values: Record<string, string> = {
    redeemUrl: buildRedeemUrl(input.serviceBaseUrl),
    cardKey: input.plaintextKey,
    createdAt: formatDeliveryDate(input.createdAt),
    expiresAt: formatDeliveryDate(input.expiresAt),
  };

  return template.replace(/\{\{\s*(redeemUrl|cardKey|createdAt|expiresAt)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}
