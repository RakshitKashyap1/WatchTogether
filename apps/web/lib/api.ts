export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL;

export type User = {
  id: string;
  email: string;
  displayName: string;
};

export function token() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("watchtogether:token");
}

export function saveSession(authToken: string, user: User) {
  window.localStorage.setItem("watchtogether:token", authToken);
  window.localStorage.setItem("watchtogether:user", JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem("watchtogether:token");
  window.localStorage.removeItem("watchtogether:user");
}

export async function api<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("content-type", "application/json");
  const authToken = token();
  if (authToken) headers.set("authorization", `Bearer ${authToken}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
}
