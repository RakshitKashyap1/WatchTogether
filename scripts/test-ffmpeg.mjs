import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const testDir = path.resolve("test-transcode");

async function run(cmd, args) {
  console.log(`   $ ${cmd} ${args.join(" ")}`);
  const { stdout, stderr } = await exec(cmd, args, { timeout: 30000 });
  if (stderr && !stderr.includes("frame=")) console.error("   stderr:", stderr.slice(0, 300));
  return { stdout, stderr };
}

async function test() {
  console.log("=== ffmpeg Transcode Test ===\n");

  await fs.mkdir(testDir, { recursive: true });

  // Step 1: Create a 3-second test video
  const testInput = path.join(testDir, "test-input.mp4");
  console.log("1. Generating 3s test video (blue screen)...");
  await run("ffmpeg", [
    "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=24:duration=3",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=mono:sample_rate=44100",
    "-c:v", "libx264", "-preset", "ultrafast",
    "-c:a", "aac", "-shortest",
    "-y", testInput
  ]);

  const stat = await fs.stat(testInput);
  console.log(`   Video size: ${(stat.size / 1024).toFixed(1)} KB`);

  // Step 2: Transcode to HLS
  const outputDir = path.join(testDir, "hls");
  await fs.mkdir(outputDir, { recursive: true });

  console.log("\n2. Transcoding to HLS...");
  await run("ffmpeg", [
    "-i", testInput,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-g", "48",
    "-sc_threshold", "0",
    "-hls_time", "4",
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", path.join(outputDir, "segment_%03d.ts"),
    "-y", path.join(outputDir, "index.m3u8")
  ]);

  // Step 3: Verify output
  const files = await fs.readdir(outputDir);
  console.log("\n3. HLS output files:", files.join(", "));

  const playlist = await fs.readFile(path.join(outputDir, "index.m3u8"), "utf8");
  console.log("\n4. Playlist content:");
  console.log(playlist.split("\n").map(l => "   " + l).join("\n"));

  // Cleanup
  await fs.rm(testDir, { recursive: true, force: true });
  console.log("\n=== ffmpeg is working correctly! ===");
}

test().catch(e => {
  console.error("ffmpeg test FAILED:", e.message);
  console.error(e.stack);
});
