import { apiFetch } from "./client";
import type { Receipt } from "@/types/public";

export const publicApi = {
  redeem(cardKey: string) {
    return apiFetch<{ receiptToken: string; receiptPath: string; goodsType: "TEXT" | "FILE" }>("/api/public/redeem", {
      method: "POST",
      body: JSON.stringify({ cardKey }),
    });
  },
  receipt(token: string) {
    return apiFetch<Receipt>(`/api/public/receipt/${encodeURIComponent(token)}`);
  },
};
