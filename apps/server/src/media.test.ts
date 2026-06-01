import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db.js", () => ({
  query: vi.fn()
}));

import { query } from "./db.js";
import { createMediaRecord } from "./media.js";

describe("createMediaRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a media record and returns it", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: "media-1", hls_path: "/stream/room-1/media-1/index.m3u8", status: "ready" }
    ]);

    const media = await createMediaRecord({
      id: "media-1",
      roomId: "room-1",
      ownerUserId: "user-1",
      originalFilename: "movie.mp4",
      hlsPath: "/stream/room-1/media-1/index.m3u8",
      status: "ready"
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into media_assets"),
      ["media-1", "room-1", "user-1", "movie.mp4", "/stream/room-1/media-1/index.m3u8", "ready"]
    );
    expect(media.id).toBe("media-1");
    expect(media.status).toBe("ready");
  });
});
