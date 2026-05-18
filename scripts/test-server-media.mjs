import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuid } from "uuid";

const exec = promisify(execFile);
const testDir = path.resolve("test-transcode-server");

async function transcodeToHls(inputPath, roomId) {
  const mediaId = uuid();
  const outputDir = path.resolve(testDir, "media", roomId, mediaId);
  const playlistPath = path.join(outputDir, "index.m3u8");
  await fs.mkdir(outputDir, { recursive: true });

  console.log("   Input:", inputPath);
  console.log("   Output:", outputDir);

  await new Promise((resolve, reject) => {
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
      .on("error", (err) => {
        console.error("   Error:", err.message);
        reject(err);
      })
      .run();
  });

  return { mediaId, hlsPath: `/stream/${roomId}/${mediaId}/index.m3u8`, outputDir };
}

async function test() {
  console.log("=== Server Media Pipeline Test ===\n");

  await fs.mkdir(testDir, { recursive: true });

  const testInput = path.join(testDir, "test-video.mp4");
  console.log("1. Creating test video...");
  await exec("ffmpeg", [
    "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=24:duration=3",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=mono:sample_rate=44100",
    "-c:v", "libx264", "-preset", "ultrafast",
    "-c:a", "aac", "-shortest",
    "-y", testInput
  ]);
  console.log("   Size:", ((await fs.stat(testInput)).size / 1024).toFixed(1), "KB");

  console.log("\n2. Running transcodeToHls() (exact code from media.ts)...");
  const result = await transcodeToHls(testInput, "test-room-123");
  console.log("   Media ID:", result.mediaId);
  console.log("   HLS path:", result.hlsPath);

  const files = await fs.readdir(result.outputDir);
  console.log("\n3. HLS files:", files.join(", "));

  const playlist = await fs.readFile(path.join(result.outputDir, "index.m3u8"), "utf8");
  console.log("\n4. Playlist:");
  console.log(playlist.split("\n").map(l => "   " + l).join("\n"));

  await fs.rm(testDir, { recursive: true, force: true });
  console.log("\n=== Server media pipeline works! ===");
}

test().catch(e => console.error("FAILED:", e.message));
