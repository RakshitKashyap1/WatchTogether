import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  // Check for existing users in Supabase auth.users (we can't query this directly via anon key)
  // But we can check our own users table
  console.log("--- Local users table ---");
  const users = await pool.query("select id, email, display_name, created_at from users limit 10");
  console.log("Local users:", JSON.stringify(users.rows, null, 2));
  console.log("Count:", users.rows.length);
} finally {
  await pool.end();
}
