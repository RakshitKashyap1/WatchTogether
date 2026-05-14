import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuid } from "uuid";
import { config } from "./config.js";
import { query } from "./db.js";

export async function transcodeToHls(inputPath: string, roomId: string) {
  const mediaId = uuid();
  const outputDir = path.resolve(config.mediaRoot, roomId, mediaId);
  const playlistPath = path.join(outputDir, "index.m3u8");
  await fs.mkdir(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-preset veryfast",
        "-g 48",
        "-sc_threshold 0",
        "-hls_time 4",
        "-hls_playlist_type vod",
        "-hls_segment_filename",
        path.join(outputDir, "segment_%03d.ts")
      ])
      .output(playlistPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  return {
    mediaId,
    hlsPath: `/stream/${roomId}/${mediaId}/index.m3u8`
  };
}

export async function createMediaRecord(input: {
  id: string;
  roomId: string;
  ownerUserId: string;
  originalFilename: string;
  hlsPath: string;
  status: "processing" | "ready" | "failed";
}) {
  const [media] = await query<{ id: string; hls_path: string; status: string }>(
    `insert into media_assets (id, room_id, owner_user_id, original_filename, hls_path, status)
     values ($1, $2, $3, $4, $5, $6)
     returning id, hls_path, status`,
    [input.id, input.roomId, input.ownerUserId, input.originalFilename, input.hlsPath, input.status]
  );
  return media;
}
