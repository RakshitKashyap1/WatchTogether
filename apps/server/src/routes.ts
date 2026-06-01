import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { login, me, register, requireAuth, syncAuthUser } from "./auth.js";
import { config } from "./config.js";
import { query } from "./db.js";
import { createMediaRecord, transcodeToHls } from "./media.js";
import { getPlaybackState, redis } from "./redis.js";

const upload = multer({
  dest: config.uploadRoot,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 1
  },
  fileFilter(_req, file, callback) {
    if (file.mimetype.startsWith("video/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Only video uploads are supported"));
  }
});
const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.get("/health/ready", async (_req, res) => {
  const checks = {
    api: "ok",
    postgres: "unknown",
    redis: "unknown"
  };

  try {
    await query("select 1");
    checks.postgres = "ok";
  } catch {
    checks.postgres = "failed";
  }

  try {
    if (!redis) {
      checks.redis = "disabled";
    } else {
      await redis.set("watchtogether:ready", "ok", { ex: 60 });
      checks.redis = (await redis.get("watchtogether:ready")) === "ok" ? "ok" : "failed";
    }
  } catch {
    checks.redis = "failed";
  }

  const ok = checks.postgres === "ok" && checks.redis === "ok";
  res.status(ok ? 200 : 503).json({ ok, checks });
});
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", requireAuth, me);
router.post("/auth/sync", requireAuth, syncAuthUser);

router.post("/rooms", requireAuth, async (req, res) => {
  const body = z.object({ title: z.string().min(1).max(120) }).parse(req.body);
  const slug = randomUUID().slice(0, 8);
  const [room] = await query<{ id: string; title: string; slug: string }>(
    `insert into rooms (host_user_id, title, slug)
     values ($1, $2, $3)
     returning id, title, slug`,
    [req.user!.id, body.title, slug]
  );

  await query("insert into room_members (room_id, user_id, role) values ($1, $2, 'host')", [
    room.id,
    req.user!.id
  ]);

  res.status(201).json(room);
});

router.get("/rooms/:slug", requireAuth, async (req, res) => {
  const [room] = await query<{
    id: string;
    title: string;
    slug: string;
    current_media_id: string | null;
    host_user_id: string;
    hls_path: string | null;
  }>(
    `select r.id, r.title, r.slug, r.current_media_id, r.host_user_id, m.hls_path
     from rooms r
     left join media_assets m on m.id = r.current_media_id
     where r.slug = $1`,
    [req.params.slug]
  );

  if (!room) return res.status(404).json({ error: "Room not found" });

  await query(
    `insert into room_members (room_id, user_id, role)
     values ($1, $2, 'viewer')
     on conflict do nothing`,
    [room.id, req.user!.id]
  );

  const messages = await query(
    `select cm.id, cm.body, cm.created_at, u.display_name
     from chat_messages cm
     join users u on u.id = cm.user_id
     where cm.room_id = $1
     order by cm.created_at asc
     limit 100`,
    [room.id]
  );

  res.json({ room, messages, playback: await getPlaybackState(room.id) });
});

router.post("/rooms/:roomId/media", requireAuth, upload.single("movie"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing movie file" });

  const [room] = await query<{ id: string; host_user_id: string }>(
    "select id, host_user_id from rooms where id = $1",
    [req.params.roomId]
  );
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.host_user_id !== req.user!.id) return res.status(403).json({ error: "Only the host can upload media" });

  const result = await transcodeToHls(req.file.path, room.id);
  fs.unlink(req.file.path, () => {});
  const media = await createMediaRecord({
    id: result.mediaId,
    roomId: room.id,
    ownerUserId: req.user!.id,
    originalFilename: req.file.originalname,
    hlsPath: result.hlsPath,
    status: "ready"
  });

  await query("update rooms set current_media_id = $1 where id = $2", [media.id, room.id]);
  res.status(201).json(media);
});

export function mountRoutes(app: express.Express) {
  app.use("/api", router);
  app.use("/stream", express.static(path.resolve(config.mediaRoot)));
  app.use("/media", express.static(path.resolve(config.mediaRoot)));
}
