import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

// Try creating a user with the same email format the login page uses
async function test() {
  console.log("Trying sign-up with host@example.com...");
  const result = await supabase.auth.signUp({
    email: "host@example.com",
    password: "password123",
    options: { data: { display_name: "Movie Host" } }
  });
  console.log("Error:", result.error?.message || "none");
  console.log("User:", result.data.user?.id || "none");
  console.log("Session:", result.data.session ? "yes" : "no");

  console.log("\nTrying sign-in...");
  const login = await supabase.auth.signInWithPassword({
    email: "host@example.com",
    password: "password123"
  });
  console.log("Error:", login.error?.message || "none");
  console.log("User:", login.data.user?.id || "none");
  console.log("Session:", login.data.session ? "yes" : "no");
}

test().catch(console.error);
