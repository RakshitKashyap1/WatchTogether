"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, Plus, User, Video } from "lucide-react";
import { api, clearSession, token, User as UserType } from "../lib/api";

export default function HomePage() {
  const [roomTitle, setRoomTitle] = useState("Friday Movie Night");
  const [error, setError] = useState("");

  const userJson = typeof window !== "undefined" ? window.localStorage.getItem("watchtogether:user") : null;
  const currentUser: UserType | null = userJson ? JSON.parse(userJson) : null;
  const isLoggedIn = Boolean(token() && currentUser);

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token()) {
      window.location.href = "/login";
      return;
    }

    try {
      const room = await api<{ slug: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ title: roomTitle })
      });
      window.location.href = `/room/${room.slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    }
  }

  return (
    <main className="shell home">
      <section className="headline">
        <Video size={44} color="var(--accent)" />
        <h1>WatchTogether</h1>
        <p>
          Host a movie, share a room link, keep playback in sync, and talk face-to-face while the video rolls.
        </p>
      </section>

      <section className="panel auth stack">
        <h2>Start a Room</h2>
        <form className="stack" onSubmit={createRoom}>
          <input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} placeholder="Room title" />
          <button type="submit">
            <Plus size={16} /> Create room
          </button>
        </form>

        {isLoggedIn ? (
          <div className="stack">
            <div className="row" style={{ opacity: 0.7, fontSize: 14 }}>
              <User size={14} /> {currentUser!.displayName} ({currentUser!.email})
            </div>
            <button className="secondary" type="button" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <Link className="row muted" href="/login">
            <LogIn size={16} /> Login or create account
          </Link>
        )}
        {error && <p className="muted">{error}</p>}
      </section>
    </main>
  );
}
