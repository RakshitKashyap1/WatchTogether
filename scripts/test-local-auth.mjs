import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function test() {
  // Test 1: Register a local user
  console.log("--- Test 1: Register ---");
  try {
    const reg = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "host@example.com", password: "password123", displayName: "Movie Host" })
    });
    console.log("Register SUCCESS:", reg.user?.email, "token:", reg.token ? "yes" : "no");
  } catch (e) {
    console.log("Register error:", e.message);
  }

  // Test 2: Login
  console.log("\n--- Test 2: Login ---");
  try {
    const login = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "host@example.com", password: "password123" })
    });
    console.log("Login SUCCESS:", login.user?.email, "token:", login.token ? "yes" : "no");

    // Test 3: Get me
    console.log("\n--- Test 3: /auth/me ---");
    const me = await api("/api/auth/me", {
      headers: { "Authorization": `Bearer ${login.token}` }
    });
    console.log("Me:", JSON.stringify(me.user, null, 2));
  } catch (e) {
    console.log("Login error:", e.message);
  }
}

test().catch(console.error);
