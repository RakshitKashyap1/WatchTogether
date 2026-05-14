import "dotenv/config";
import { Redis } from "@upstash/redis";
import pg from "pg";

const results = {
  postgres: "unknown",
  redis: "unknown"
};

try {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const db = await pool.query("select 1 as ok");
  await pool.end();
  results.postgres = db.rows[0]?.ok === 1 ? "ok" : "unexpected response";
} catch (error) {
  results.postgres = `failed: ${error.message}`;
}

try {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
  await redis.set("watchtogether:health", "ok", { ex: 60 });
  results.redis = (await redis.get("watchtogether:health")) === "ok" ? "ok" : "unexpected response";
} catch (error) {
  results.redis = `failed: ${error.message}`;
}

console.log(JSON.stringify(results, null, 2));

if (results.postgres !== "ok" || results.redis !== "ok") {
  process.exitCode = 1;
}
