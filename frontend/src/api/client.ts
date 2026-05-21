let csrfToken = window.localStorage.getItem("auto_delivery_csrf") ?? "";

export function setCsrfToken(token: string) {
  csrfToken = token;
  window.localStorage.setItem("auto_delivery_csrf", token);
}

export function clearCsrfToken() {
  csrfToken = "";
  window.localStorage.removeItem("auto_delivery_csrf");
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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
