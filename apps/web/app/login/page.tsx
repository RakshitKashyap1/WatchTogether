"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, Video } from "lucide-react";
import { api, saveSession } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("host@example.com");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("Movie Host");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register") body.displayName = displayName;

      const result = await api<{ token: string; user: { id: string; email: string; displayName: string } }>(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });

      saveSession(result.token, result.user);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  return (
    <main className="shell home">
      <section className="headline">
        <Video size={44} color="var(--accent)" />
        <h1>WatchTogether</h1>
        <p>Sign in once, then create or join rooms with synced playback, chat, and live video.</p>
      </section>

      <form className="panel auth stack" onSubmit={submit}>
        <h2>{mode === "login" ? "Login" : "Create Account"}</h2>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        {mode === "register" && (
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
          />
        )}
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        <div className="row">
          <button type="submit">
            {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === "login" ? "Login" : "Register"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          >
            {mode === "login" ? "Need account" : "Have account"}
          </button>
        </div>
        <Link className="muted" href="/">
          Back to rooms
        </Link>
        {error && <p className="muted">{error}</p>}
      </form>
    </main>
  );
}
