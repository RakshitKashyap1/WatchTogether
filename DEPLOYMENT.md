# Deployment

WatchTogether deploys as two services:

- `watchtogether-api`: Express, Socket.IO, FFmpeg, uploaded HLS files
- `watchtogether-web`: Next.js frontend

## Required Services

- Supabase Postgres using the transaction pooler URL
- Supabase Auth enabled for email/password and any OAuth providers you want
- Upstash Redis REST URL and token
- A backend host that supports WebSockets and persistent disk for uploaded media
- FFmpeg installed on the backend runtime

## Environment

Copy `.env.production.example` into your deployment provider and replace every placeholder.

Backend variables:

```bash
NODE_ENV=production
PORT=4000
CLIENT_URLS=https://your-web-domain.example
JWT_SECRET=long-random-secret
SUPABASE_JWT_SECRET=your-supabase-auth-jwt-secret
DATABASE_URL=postgresql://postgres.project-ref:password@aws-region.pooler.supabase.com:6543/postgres
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
MEDIA_ROOT=/data/media
UPLOAD_ROOT=/data/uploads
```

Frontend variables:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.example
NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Auth

In Supabase Dashboard:

1. Enable email/password auth under Authentication.
2. For Google or GitHub OAuth, enable the provider and add its client ID/secret.
3. Add redirect URLs:

```text
http://localhost:3000/login/callback
https://your-web-domain.example/login/callback
```

4. Copy these values into your environments:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
```

The frontend uses Supabase Auth for login/signup/OAuth. The backend verifies Supabase JWTs and syncs users into the `public.users` profile table used by rooms and chat.

## Database

Apply the schema before first deploy:

```bash
npm run db:apply
```

Check both external services:

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
