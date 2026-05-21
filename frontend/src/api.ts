import type {
  AdminSession,
  AuditLog,
  CardKey,
  Goods,
  LogType,
  LogsResponse,
  Overview,
  PaginatedCardKeysResponse,
  PaginatedGoodsResponse,
  Receipt,
  Settings,
} from "./types";

let csrfToken = window.localStorage.getItem("auto_delivery_csrf") ?? "";

export function setCsrfToken(token: string) {
  csrfToken = token;
  window.localStorage.setItem("auto_delivery_csrf", token);
}

export function clearCsrfToken() {
  csrfToken = "";
  window.localStorage.removeItem("auto_delivery_csrf");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken && init.method && init.method !== "GET") {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? "请求失败");
  }
  return response.json() as Promise<T>;
}

export const api = {
  redeem(cardKey: string) {
    return apiFetch<{ receiptToken: string; receiptPath: string; goodsType: "TEXT" | "FILE" }>("/api/public/redeem", {
      method: "POST",
      body: JSON.stringify({ cardKey }),
    });
  },
  receipt(token: string) {
    return apiFetch<Receipt>(`/api/public/receipt/${encodeURIComponent(token)}`);
  },
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
  updateGoods(id: string, status: "ACTIVE" | "DISABLED") {
    return apiFetch<{ ok: true }>(`/api/admin/goods/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
