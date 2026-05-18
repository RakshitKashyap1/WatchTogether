"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Github, LogIn, UserPlus, Video } from "lucide-react";
import { api, saveSession } from "../../lib/api";
import { getSupabaseClient } from "../../lib/supabase";

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
      const supabase = await getSupabaseClient();
      if (!supabase) {
        setError("Supabase Auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        return;
      }

      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  display_name: displayName
                }
              }
            });

      if (result.error) throw result.error;
      if (!result.data.session) {
        setError("Check your email to confirm your account, then log in.");
        return;
      }

      const session = result.data.session;
      const user = {
        id: session.user.id,
        email: session.user.email ?? email,
        displayName:
          (session.user.user_metadata.display_name as string | undefined) ??
          (session.user.user_metadata.full_name as string | undefined) ??
          displayName
      };
      saveSession(session.access_token, user);
      await api("/api/auth/sync", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  async function signInWithGoogle() {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      setError("Supabase Auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login/callback`
      }
    });
    if (authError) setError(authError.message);
  }

  async function signInWithGithub() {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      setError("Supabase Auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/login/callback`
      }
    });
    if (authError) setError(authError.message);
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
        <div className="row">
          <button className="secondary" type="button" onClick={signInWithGoogle}>
            <LogIn size={16} /> Google
          </button>
          <button className="secondary" type="button" onClick={signInWithGithub}>
            <Github size={16} /> GitHub
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
