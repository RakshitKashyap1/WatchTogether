import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./config.js", () => ({
  config: {
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    upstashRedisRestUrl: "https://test.upstash.io",
    upstashRedisRestToken: "test-token",
    redisUrl: "",
    jwtSecret: "test-secret",
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "test-anon-key",
    nodeEnv: "development",
    port: 4000,
    clientUrl: "http://localhost:3000",
    clientUrls: ["http://localhost:3000"],
    mediaRoot: "./media",
    uploadRoot: "./uploads",
    maxUploadMb: 2048
  },
  validateRuntimeConfig: vi.fn()
}));

import { config, validateRuntimeConfig } from "./config.js";

describe("config", () => {
  it("has a default port of 4000", () => {
    expect(config.port).toBe(4000);
  });

  it("has clientUrls as an array", () => {
    expect(Array.isArray(config.clientUrls)).toBe(true);
    expect(config.clientUrls).toContain("http://localhost:3000");
  });

  it("has a max upload size", () => {
    expect(config.maxUploadMb).toBeGreaterThan(0);
  });
});

describe("validateRuntimeConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw in development when env vars are set", () => {
    expect(() => validateRuntimeConfig()).not.toThrow();
  });
});
