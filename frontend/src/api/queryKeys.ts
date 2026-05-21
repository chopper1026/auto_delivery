import type { LogType } from "@/types/admin";
import type { CardKeyStatus, GoodsStatus } from "@/types/shared";

export const queryKeys = {
  session: ["session"] as const,
  overview: ["overview"] as const,
  settings: ["settings"] as const,
  receipt: (token: string) => ["receipt", token] as const,
  goods: (input: { q?: string; status?: GoodsStatus | ""; page?: number } = {}) =>
    ["goods", input.q ?? "", input.status ?? "", input.page ?? 1] as const,
  goodsRoot: ["goods"] as const,
  cardGoodsOptions: (query = "") => ["goods", "card-options", query] as const,
  cardGoodsOptionsRoot: ["goods", "card-options"] as const,
  cardKeys: (input: { q?: string; status?: CardKeyStatus | ""; page?: number } = {}) =>
    ["cardKeys", input.q ?? "", input.status ?? "", input.page ?? 1] as const,
  cardKeysRoot: ["cardKeys"] as const,
  logs: (input: { type: LogType; q?: string; page?: number }) => ["logs", input.type, input.q ?? "", input.page ?? 1] as const,
};
