import "dotenv/config";
import fs from "node:fs/promises";
import pg from "pg";

const sql = await fs.readFile("db/schema.sql", "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await pool.query(sql);
  const tables = await pool.query(
    `select table_name
     from information_schema.tables
     where table_schema = $1
       and table_name = any($2)
     order by table_name`,
    ["public", ["users", "rooms", "room_members", "media_assets", "chat_messages"]]
  );

  console.log(
    JSON.stringify(
      {
        applied: true,
        tables: tables.rows.map((row) => row.table_name)
      },
      null,
      2
    )
  );
} finally {
  await pool.end();
}
