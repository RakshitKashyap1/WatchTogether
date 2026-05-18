import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("Missing Supabase config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function testAuth() {
  console.log("Supabase URL:", supabaseUrl);
  
  // Test 1: Try to sign in with the default credentials
  console.log("\n--- Test 1: signInWithPassword ---");
  const signInResult = await supabase.auth.signInWithPassword({
    email: "host@example.com",
    password: "password123"
  });
  
  if (signInResult.error) {
    console.log("Sign-in error:", signInResult.error.message, signInResult.error.status);
  } else if (signInResult.data.session) {
    console.log("Sign-in SUCCESS! User:", signInResult.data.user?.id);
    console.log("Has session:", !!signInResult.data.session);
    
    // Test 2: Verify the token using getUser
    console.log("\n--- Test 2: getUser with token ---");
    const token = signInResult.data.session.access_token;
    const getUserResult = await supabase.auth.getUser(token);
    if (getUserResult.error) {
      console.log("getUser error:", getUserResult.error.message);
    } else {
      console.log("getUser SUCCESS! User ID:", getUserResult.data.user?.id);
      console.log("Email:", getUserResult.data.user?.email);
      console.log("User metadata:", JSON.stringify(getUserResult.data.user?.user_metadata));
    }
  } else {
    console.log("No session, no error - check email confirmation settings");
  }

  // Test 3: Try to register
  console.log("\n--- Test 3: signUp ---");
  const signUpResult = await supabase.auth.signUp({
    email: "test@example.com",
    password: "password123",
    options: {
      data: { display_name: "Test User" }
    }
  });
  if (signUpResult.error) {
    console.log("Sign-up error:", signUpResult.error.message);
  } else {
    console.log("Sign-up result:", signUpResult.data.user?.id);
    console.log("Has session:", !!signUpResult.data.session);
  }
}

testAuth().catch(console.error);
