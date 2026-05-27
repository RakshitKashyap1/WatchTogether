# Deployment

WatchTogether deploys as two services:

- `watchtogether-api`: Express, Socket.IO, FFmpeg, uploaded HLS files
- `watchtogether-web`: Next.js frontend

## Required Services

- PostgreSQL for users, rooms, memberships, chat history, media metadata
- Upstash Redis REST URL and token
- A backend host that supports WebSockets and persistent disk for uploaded media
- FFmpeg installed on the backend runtime

## Environment

Copy `.env.production.example` into your deployment provider and replace every placeholder.

Backend variables:

```bash
NODE_ENV=production
PORT=4000
CLIENT_URL=https://your-watchtogether-web.example.com
CLIENT_URLS=https://your-watchtogether-web.example.com
JWT_SECRET=long-random-secret
DATABASE_URL=postgresql://postgres:password@your-postgres-host:5432/postgres
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
MEDIA_ROOT=/data/media
UPLOAD_ROOT=/data/uploads
```

Frontend variables:

```bash
NEXT_PUBLIC_API_URL=https://your-watchtogether-api.example.com
NEXT_PUBLIC_SOCKET_URL=https://your-watchtogether-api.example.com
```

## Database

Apply the schema before first deploy:

```bash
npm run db:apply
```

or manually:

```bash
psql -f db/schema.sql
```

Check external services:

```bash
npm run check:services
```

## Render Blueprint

`render.yaml` defines both services. Create a new Blueprint on Render, connect this repo, then fill the synced secret values. The API service includes a persistent disk mounted at `/data`, which is required for uploaded HLS chunks.

## Docker

Build backend:

```bash
docker build -f Dockerfile.server -t watchtogether-api .
```

Build frontend:

```bash
docker build -f Dockerfile.web -t watchtogether-web \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api-domain.example \
  --build-arg NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.example .
```

## Health Checks

- Liveness: `/api/health`
- Readiness: `/api/health/ready`

Readiness verifies Postgres and Redis.
