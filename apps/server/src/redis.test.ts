import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock("./config.js", () => ({
  config: {
    upstashRedisRestUrl: "https://test.upstash.io",
    upstashRedisRestToken: "test-token",
    redisUrl: ""
  }
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => mockRedisClient)
}));

import { getPlaybackState, setPlaybackState } from "./redis.js";

describe("getPlaybackState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no state exists", async () => {
    mockRedisClient.get.mockResolvedValue(null);
    const state = await getPlaybackState("room-1");
    expect(state).toBeNull();
  });

  it("returns parsed state when it exists", async () => {
    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({
        roomId: "room-1",
        mediaId: null,
        position: 42,
        paused: false,
        updatedAt: 1000
      })
    );

    const state = await getPlaybackState("room-1");
    expect(state).not.toBeNull();
    expect(state!.roomId).toBe("room-1");
    expect(state!.position).toBe(42);
    expect(state!.paused).toBe(false);
  });
});

describe("setPlaybackState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores state with 24-hour expiry", async () => {
    const state = {
      roomId: "room-1",
      mediaId: null,
      position: 10,
      paused: true,
      updatedAt: Date.now()
    };

    mockRedisClient.set.mockResolvedValue("OK");

    await setPlaybackState(state);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      "room:room-1:playback",
      expect.any(String),
      { ex: 86400 }
    );
  });
});
