import { apiFetch } from "./client";
import type { AdminSession, LogsResponse, Overview, Settings } from "@/types/admin";
import type { Goods, PaginatedCardKeysResponse, PaginatedGoodsResponse, UpdateGoodsInput } from "@/types/shared";
import type { LogType } from "@/types/admin";

export const adminApi = {
  login(username: string, password: string) {
    return apiFetch<AdminSession>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  session() {
    return apiFetch<AdminSession>("/api/admin/session");
  },
  logout() {
    return apiFetch<{ ok: true }>("/api/admin/session", { method: "DELETE" });
  },
  overview() {
    return apiFetch<Overview>("/api/admin/overview");
  },
  goods(params: { q?: string; status?: "ACTIVE" | "DISABLED"; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.page) search.set("page", String(params.page));
    if (params.pageSize) search.set("pageSize", String(params.pageSize));
    const query = search.toString();
    return apiFetch<PaginatedGoodsResponse>(`/api/admin/goods${query ? `?${query}` : ""}`);
  },
  cardGoodsOptions(params: { q?: string; limit?: number } = {}) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<{ items: Goods[] }>(`/api/admin/goods/card-options${query ? `?${query}` : ""}`);
  },
  createGoods(input: { name: string; type: "TEXT" | "FILE"; textContent?: string; note?: string }) {
    return apiFetch<{ id: string; items: Goods[] }>("/api/admin/goods", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateGoods(id: string, input: UpdateGoodsInput) {
    return apiFetch<{ ok: true }>(`/api/admin/goods/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteGoods(id: string) {
    return apiFetch<{ ok: true }>(`/api/admin/goods/${id}`, { method: "DELETE" });
  },
  uploadFiles(goodsId: string, files: FileList) {
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("files", file));
    return apiFetch<{ acceptedCount: number }>(`/api/admin/goods/${goodsId}/files`, { method: "POST", body });
  },
  cardKeys(params: { q?: string; status?: "ACTIVE" | "REDEEMED" | "EXPIRED" | "DELETED"; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.page) search.set("page", String(params.page));
    if (params.pageSize) search.set("pageSize", String(params.pageSize));
    const query = search.toString();
    return apiFetch<PaginatedCardKeysResponse>(`/api/admin/card-keys${query ? `?${query}` : ""}`);
  },
  generateCardKey(input: { goodsId: string; expiration: string; fileQuantity: number }) {
    return apiFetch<{
      id: string;
      plaintextKey: string;
      keyMask: string;
      deliveryMessage: string;
      expiresAt?: string;
      createdAt: string;
    }>("/api/admin/card-keys", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  deleteCardKey(id: string) {
    return apiFetch<{ ok: true }>(`/api/admin/card-keys/${id}`, { method: "DELETE" });
  },
  logs(params: { type?: LogType; q?: string; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.q) search.set("q", params.q);
    if (params.page) search.set("page", String(params.page));
    if (params.pageSize) search.set("pageSize", String(params.pageSize));
    const query = search.toString();
    return apiFetch<LogsResponse>(`/api/admin/logs${query ? `?${query}` : ""}`);
  },
  settings() {
    return apiFetch<Settings>("/api/admin/settings");
  },
  updateSettings(input: Partial<Settings>) {
    return apiFetch<Settings>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
