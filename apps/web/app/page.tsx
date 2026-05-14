"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn, Plus, Video } from "lucide-react";
import { api, token } from "../lib/api";

export default function HomePage() {
  const [roomTitle, setRoomTitle] = useState("Friday Movie Night");
  const [error, setError] = useState("");

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
        <Link className="row muted" href="/login">
          <LogIn size={16} /> Login or create account
        </Link>
        {error && <p className="muted">{error}</p>}
      </section>
    </main>
  );
}
