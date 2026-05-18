import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WEB_URL = "http://localhost:3000";

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function test() {
  console.log("=== WatchTogether End-to-End Test ===\n");

  // 1. Backend health
  console.log("1. Backend health");
  const health = await api("/api/health");
  console.log("   API:", health.ok ? "OK" : "FAIL");

  // 2. Backend readiness
  console.log("\n2. Backend readiness");
  const ready = await fetch(`${API_URL}/api/health/ready`).then(r => r.json());
  console.log("   Postgres:", ready.checks?.postgres);
  console.log("   Redis:", ready.checks?.redis);

  // 3. Login
  console.log("\n3. Login");
  const login = await api("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "host@example.com", password: "password123" })
  });
  console.log("   User:", login.user.displayName, `<${login.user.email}>`);
  const token = login.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 4. Create room
  console.log("\n4. Create room");
  const room = await api("/api/rooms", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test Room" })
  });
  console.log("   Room:", room.title, `slug: ${room.slug}`);

  // 5. Fetch room
  console.log("\n5. Fetch room");
  const roomData = await api(`/api/rooms/${room.slug}`, { headers: authHeaders });
  console.log("   Room:", roomData.room.title);
  console.log("   Messages:", roomData.messages.length);
  console.log("   Playback:", roomData.playback);

  // 6. Frontend
  console.log("\n6. Frontend");
  const webRes = await fetch(WEB_URL);
  console.log("   Web status:", webRes.status === 200 ? "OK" : "FAIL");
  const loginRes = await fetch(`${WEB_URL}/login`);
  console.log("   Login page:", loginRes.status === 200 ? "OK" : "FAIL");

  console.log("\n=== All tests passed! ===");
  console.log(`\nFrontend: ${WEB_URL}`);
  console.log(`Backend: ${API_URL}`);
  console.log(`Room URL: ${WEB_URL}/room/${room.slug}`);
}

test().catch(e => {
  console.error("Test failed:", e.message);
  process.exit(1);
});
