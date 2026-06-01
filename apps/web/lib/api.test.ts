/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(globalThis, "window", {
  value: { localStorage: localStorageMock, location: { href: "" } },
  writable: true,
  configurable: true
});

import { token, saveSession, clearSession, api } from "./api";

describe("token", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns null when no token is stored", () => {
    expect(token()).toBeNull();
  });

  it("returns the stored token", () => {
    localStorageMock.setItem("watchtogether:token", "my-token");
    expect(token()).toBe("my-token");
  });
});

describe("saveSession", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("stores token and user in localStorage", () => {
    const user = { id: "u1", email: "a@b.com", displayName: "A" };
    saveSession("tok-123", user);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("watchtogether:token", "tok-123");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("watchtogether:user", JSON.stringify(user));
  });
});

describe("clearSession", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("removes token and user from localStorage", () => {
    saveSession("tok-123", { id: "u1", email: "a@b.com", displayName: "A" });
    clearSession();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("watchtogether:token");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("watchtogether:user");
  });
});

describe("api", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("sends Authorization header when token exists", async () => {
    localStorageMock.setItem("watchtogether:token", "tok-123");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true })
    } as any);

    await api("/test");

    const headers = fetchSpy.mock.calls[0][1]!.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok-123");
  });

  it("throws on non-ok response with error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad request" })
    } as any);

    await expect(api("/test")).rejects.toThrow("Bad request");
  });

  it("throws generic message when no error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error"))
    } as any);

    await expect(api("/test")).rejects.toThrow("Request failed");
  });

  it("redirects to login on 401", async () => {
    localStorageMock.setItem("watchtogether:token", "expired-token");
    localStorageMock.setItem("watchtogether:user", JSON.stringify({ id: "u1", email: "a@b.com", displayName: "A" }));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid token" })
    } as any);

    await expect(api("/test")).rejects.toThrow("Session expired");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("watchtogether:token");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("watchtogether:user");
  });
});
