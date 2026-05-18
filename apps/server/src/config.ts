import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

const clientUrls = (process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientUrl: clientUrls[0] ?? "http://localhost:3000",
  clientUrls,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  mediaRoot: process.env.MEDIA_ROOT ?? "./media",
  uploadRoot: process.env.UPLOAD_ROOT ?? "./uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 2048)
};

export function validateRuntimeConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.upstashRedisRestUrl && !config.redisUrl) missing.push("UPSTASH_REDIS_REST_URL or REDIS_URL");
  if (!config.upstashRedisRestToken && !config.redisUrl) missing.push("UPSTASH_REDIS_REST_TOKEN");
  if (config.nodeEnv === "production" && config.jwtSecret === "dev-secret-change-me") missing.push("JWT_SECRET");
  if (config.nodeEnv === "production" && !config.supabaseUrl) missing.push("SUPABASE_URL");
  if (config.nodeEnv === "production" && !config.supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
