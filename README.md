# WatchTogether

Real-time synchronized movie streaming with video/audio chat.

## Stack

- `apps/web`: Next.js app with Socket.IO client and WebRTC peer chat
- `apps/server`: Express API, Socket.IO room sync, JWT auth, FFmpeg HLS transcoding
- PostgreSQL: users, rooms, memberships, chat history, media metadata
- Redis/Upstash: hot playback state cache

## Quick Start

1. Copy `.env.example` to `.env` and fill in secrets/URLs.
2. Install dependencies:

```bash
npm install
```

3. Apply `db/schema.sql` to your PostgreSQL database.
4. Make sure `ffmpeg` is available on your PATH.
5. Run both apps:

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`; the API and socket server run on `http://localhost:4000`.

## Production Readiness

Use these checks before deploying:

```bash
npm run db:apply
npm run check:services
npm run build
```

Deployment notes, Dockerfiles, required environment variables, and the Render blueprint are in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Core Flow

1. Register or log in.
2. Create a room.
3. Upload a movie. The server transcodes it into HLS chunks under `MEDIA_ROOT`.
4. Share the room URL.
5. Host playback actions emit Socket.IO events and update Redis.
6. Participants connect video/audio chat through WebRTC signaling over Socket.IO.
