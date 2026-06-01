"use client";

import Hls from "hls.js";
import { Send, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api, API_URL, SOCKET_URL, token } from "../../../lib/api";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  display_name: string;
};

type RoomPayload = {
  room: {
    id: string;
    title: string;
    slug: string;
    current_media_id: string | null;
    host_user_id: string;
    hls_path: string | null;
  };
  messages: ChatMessage[];
  playback: { position: number; paused: boolean } | null;
};

export default function RoomClient({ slug }: { slug: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [roomData, setRoomData] = useState<RoomPayload | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peers, setPeers] = useState<string[]>([]);
  const [chat, setChat] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<RoomPayload>(`/api/rooms/${slug}`)
      .then((payload) => {
        setRoomData(payload);
        setMessages(payload.messages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load room"));
  }, [slug]);

  useEffect(() => {
    if (!roomData) return;
    const authToken = token();
    if (!authToken) return;

    const socket = io(SOCKET_URL, { auth: { token: authToken } });
    socketRef.current = socket;
    socket.emit("room:join", roomData.room.id);
    socket.on("room:peers", (items: { socketId: string }[]) => setPeers(items.map((item) => item.socketId)));
    socket.on("presence:joined", ({ socketId }: { socketId: string }) =>
      setPeers((items) => (items.includes(socketId) ? items : [...items, socketId]))
    );
    socket.on("presence:left", ({ socketId }: { socketId: string }) =>
      setPeers((items) => items.filter((id) => id !== socketId))
    );
    socket.on("chat:message", (message: ChatMessage) => setMessages((items) => [...items, message]));
    socket.on("playback:update", ({ position, paused }: { position: number; paused: boolean }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - position) > 1.2) video.currentTime = position;
      if (paused) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    });

    socket.on("webrtc:offer", async ({ from, offer }) => {
      const peer = await ensurePeer(socket, from);
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetId: from, answer });
    });
    socket.on("webrtc:answer", async ({ answer }) => peerRef.current?.setRemoteDescription(answer));
    socket.on("webrtc:ice-candidate", async ({ candidate }) => peerRef.current?.addIceCandidate(candidate));

    return () => {
      socket.disconnect();
    };
  }, [roomData]);

  useEffect(() => {
    const video = videoRef.current;
    const playback = roomData?.playback;
    if (!video || !playback) return;
    video.currentTime = playback.position;
    if (!playback.paused) {
      video.play().catch(() => {});
    }
  }, [roomData?.playback]);

  useEffect(() => {
    const source = roomData?.room.hls_path;
    const video = videoRef.current;
    if (!source || !video) return;

    const url = `${API_URL}${source}`;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }

    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [roomData?.room.hls_path]);

  async function ensurePeer(socket: Socket, targetId?: string) {
    if (peerRef.current) return peerRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    peer.onicecandidate = (event) => {
      if (event.candidate && targetId) socket.emit("webrtc:ice-candidate", { targetId, candidate: event.candidate });
    };
    peerRef.current = peer;
    return peer;
  }

  async function startCall() {
    const socket = socketRef.current;
    if (!socket || !roomData) return;
    const targetId = peers[0];
    if (!targetId) {
      setError("Waiting for another viewer to join before starting video chat.");
      return;
    }
    const peer = await ensurePeer(socket, targetId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("webrtc:offer", { roomId: roomData.room.id, targetId, offer });
  }

  function broadcastPlayback(paused: boolean) {
    const video = videoRef.current;
    if (!video || !roomData) return;
    socketRef.current?.emit("playback:update", {
      roomId: roomData.room.id,
      mediaId: roomData.room.current_media_id,
      position: video.currentTime,
      paused
    });
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomData) return;
    const file = new FormData(event.currentTarget).get("movie");
    if (!(file instanceof File) || !file.name) return;

    setUploading(true);
    const body = new FormData();
    body.set("movie", file);
    try {
      await api(`/api/rooms/${roomData.room.id}/media`, { method: "POST", body });
      const refreshed = await api<RoomPayload>(`/api/rooms/${slug}`);
      setRoomData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!chat.trim() || !roomData) return;
    socketRef.current?.emit("chat:send", { roomId: roomData.room.id, body: chat.trim() });
    setChat("");
  }

  if (!roomData) {
    return <main className="shell">{error || "Loading room..."}</main>;
  }

  return (
    <main className="shell room">
      <section className="theater">
        <h1>{roomData.room.title}</h1>
        <video
          ref={videoRef}
          className="video"
          controls
          onPlay={() => broadcastPlayback(false)}
          onPause={() => broadcastPlayback(true)}
          onSeeked={() => broadcastPlayback(videoRef.current?.paused ?? true)}
        />
        <div className="toolbar">
          <form className="row" onSubmit={upload}>
            <input name="movie" type="file" accept="video/*" />
            <button type="submit" disabled={uploading}>
              <Upload size={16} /> {uploading ? "Transcoding..." : "Upload"}
            </button>
          </form>
          <button className="secondary" type="button" onClick={startCall}>
            Start video chat
          </button>
        </div>
        {error && <p className="muted">{error}</p>}
      </section>

      <aside className="side">
        <section className="panel peers">
          <video ref={localVideoRef} autoPlay muted playsInline />
          <video ref={remoteVideoRef} autoPlay playsInline />
        </section>
        <section className="panel chat">
          {messages.map((message) => (
            <p key={message.id}>
              <strong>{message.display_name}:</strong> {message.body}
            </p>
          ))}
        </section>
        <form className="row" onSubmit={sendChat}>
          <input value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Message" />
          <button type="submit" aria-label="Send message">
            <Send size={16} />
          </button>
        </form>
      </aside>
    </main>
  );
}
