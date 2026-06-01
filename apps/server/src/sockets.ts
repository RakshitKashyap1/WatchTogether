import type { Server } from "socket.io";
import { verifySocketToken } from "./auth.js";
import { query } from "./db.js";
import { setPlaybackState } from "./redis.js";

type PlaybackEvent = {
  roomId: string;
  mediaId: string | null;
  position: number;
  paused: boolean;
};

export function registerSocketHandlers(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string") return next(new Error("Missing auth token"));

    try {
      socket.data.user = await verifySocketToken(token);
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async (roomId: string) => {
      const peers = await io.in(roomId).fetchSockets();
      await socket.join(roomId);
      socket.emit(
        "room:peers",
        peers.map((peer) => ({ socketId: peer.id, user: peer.data.user }))
      );
      socket.to(roomId).emit("presence:joined", { socketId: socket.id, user: socket.data.user });
    });

    socket.on("playback:update", async (event: PlaybackEvent) => {
      const state = { ...event, updatedAt: Date.now() };
      await setPlaybackState(state);
      socket.to(event.roomId).emit("playback:update", state);
    });

    socket.on("chat:send", async ({ roomId, body }: { roomId: string; body: string }) => {
      const trimmed = body.trim().slice(0, 1000);
      if (!trimmed) return;

      const [message] = await query<{ id: string; body: string; created_at: string }>(
        `insert into chat_messages (room_id, user_id, body)
         values ($1, $2, $3)
         returning id, body, created_at`,
        [roomId, socket.data.user.id, trimmed]
      );
      io.to(roomId).emit("chat:message", { ...message, display_name: socket.data.user.displayName });
    });

    socket.on("webrtc:offer", ({ roomId, targetId, offer }) => {
      socket.to(targetId ?? roomId).emit("webrtc:offer", { from: socket.id, offer });
    });

    socket.on("webrtc:answer", ({ targetId, answer }) => {
      socket.to(targetId).emit("webrtc:answer", { from: socket.id, answer });
    });

    socket.on("webrtc:ice-candidate", ({ targetId, candidate }) => {
      socket.to(targetId).emit("webrtc:ice-candidate", { from: socket.id, candidate });
    });

    socket.on("disconnect", () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          socket.to(roomId).emit("presence:left", { socketId: socket.id, user: socket.data.user });
        }
      }
    });
  });
}
