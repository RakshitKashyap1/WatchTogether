import { Redis as UpstashRedis } from "@upstash/redis";
import { Redis } from "ioredis";
import { config } from "./config.js";

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
};

const hasUpstash = config.upstashRedisRestUrl && config.upstashRedisRestToken;
const upstash = hasUpstash
  ? new UpstashRedis({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken
    })
  : null;

const socketRedis = !hasUpstash && config.redisUrl ? new Redis(config.redisUrl) : null;

export const redis: RedisClient | null = upstash
  ? {
      get: (key) => upstash.get<string>(key),
      set: (key, value, options) => upstash.set(key, value, { ex: options.ex })
    }
  : socketRedis
    ? {
        get: (key) => socketRedis.get(key),
        set: (key, value, options) => socketRedis.set(key, value, "EX", options.ex)
      }
    : null;

export type PlaybackState = {
  roomId: string;
  mediaId: string | null;
  position: number;
  paused: boolean;
  updatedAt: number;
};

export async function getPlaybackState(roomId: string): Promise<PlaybackState | null> {
  if (!redis) return null;
  const raw = await redis.get(`room:${roomId}:playback`);
  return raw ? (JSON.parse(raw) as PlaybackState) : null;
}

export async function setPlaybackState(state: PlaybackState) {
  if (!redis) return;
  await redis.set(`room:${state.roomId}:playback`, JSON.stringify(state), { ex: 60 * 60 * 24 });
}
