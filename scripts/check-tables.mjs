import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  console.log("Tables:", JSON.stringify(tables.rows, null, 2));

  // Check for specific tables
  const expected = ["users", "rooms", "room_members", "media_assets", "chat_messages"];
  const found = tables.rows.map(r => r.table_name);
  const missing = expected.filter(t => !found.includes(t));
  if (missing.length > 0) {
    console.log("Missing tables:", missing.join(", "));
  } else {
    console.log("All expected tables exist!");
  }
} finally {
  await pool.end();
}
