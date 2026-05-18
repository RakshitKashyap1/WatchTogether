import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function test() {
  // Try various email formats
  const emails = [
    "user@gmail.com",
    "test.user@outlook.com",
    "hello@domain.com",
    "admin@watchtogether.app",
  ];

  for (const email of emails) {
    console.log(`\nTrying ${email}...`);
    const result = await supabase.auth.signUp({
      email,
      password: "password123",
      options: { data: { display_name: "Test User" } }
    });
    console.log("  Error:", result.error?.message || "none");
    console.log("  User:", result.data.user?.id || "none");
    console.log("  Session:", result.data.session ? "yes" : "no");
  }
}

test().catch(console.error);
