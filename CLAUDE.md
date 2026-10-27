# CLAUDE.md - ModelArena Project Guide

## Project Overview

ModelArena is an AI video generation comparison platform. It benchmarks multiple AI video generation models (Kling, Runway, Veo, Sora, Hailuo, etc.) using identical prompts/images and displays results side-by-side for comparison.

**Key Concepts:**

- **Comparison**: A benchmark session with a prompt (and optional source image) tested across multiple models
- **Video**: A single generated video from one model within a comparison
- **Provider**: An API service (fal.ai, Runway, manual upload)
- **Model**: A specific AI model variant (e.g., "Kling 2.5 Turbo Pro")

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js 15 (App Router)              |
| Language   | TypeScript                           |
| Database   | PostgreSQL + Prisma ORM              |
| Storage    | Cloudflare R2 (S3-compatible)        |
| Queue      | Redis + BullMQ                       |
| Auth       | NextAuth.js v5 (GitHub/Google OAuth) |
| Styling    | Tailwind CSS + shadcn/ui             |
| Thumbnails | FFmpeg (server-side)                 |

## Commands

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript compiler check
pnpm test             # Unit tests (node:test, tests/*.test.ts)

# Database
pnpm db:push          # Push schema changes (dev)
pnpm db:migrate       # Run migrations (prod)
pnpm db:seed          # Seed initial data (models, providers)
pnpm db:studio        # Open Prisma Studio

# Worker
pnpm worker           # Start BullMQ worker process

# Docker
docker compose up -d  # Start all services
docker compose logs -f app  # View app logs
```

## Project Structure

```
app/
├── page.tsx                # Homepage
├── comparisons/ models/ tags/ analytics/ how-it-works/   # Public pages
├── admin/                  # Admin pages (auth required)
│   ├── generate/           # Create new comparison
│   ├── comparisons/        # Manage comparisons
│   ├── upload/             # Manual video upload
│   └── jobs/               # Queue monitoring
└── api/                    # API routes
components/
├── ui/                     # shadcn/ui components
├── comparison-video-grid.tsx  # Video grid + Play All on a comparison page
└── ...
hooks/                      # Client hooks (hover-play, job stream)
lib/
├── data/public.ts          # Cached public queries (unstable_cache, tag revalidation)
├── admin-input.ts          # zod schemas for admin API bodies
├── manual-video.ts         # Manual upload validation + finish
├── voter.ts                # Signed anonymous voter cookie, IP hash
├── auth.ts  prisma.ts  rate-limit.ts
src/lib/
├── providers/              # AI provider abstractions
│   ├── types.ts            # VideoProvider interface
│   ├── fal.ts  runway.ts  manual.ts
│   └── registry.ts         # Provider lookup
├── storage/                # R2 client (r2.ts), download + upload (ingest.ts)
├── queue/                  # BullMQ queue + worker
├── pricing/                # Cost calculator
└── thumbnails/             # FFmpeg thumbnail extraction
worker/index.ts             # Worker entry point
tests/                      # Unit tests
```

## Database Schema (Key Tables)

- **Provider**: API providers (fal.ai, runway, manual)
- **Model**: AI models with endpoints and capabilities
- **Comparison**: A benchmark with prompt, source image, visibility settings
- **Video**: Generated video with metrics (time, cost, status, R2 URLs)
- **Vote**: Anonymous votes (signed voter cookie + IP hash)
- **Job**: Unused by the app; queue state lives in Redis (BullMQ)

**Video Statuses:** `PENDING` → `QUEUED` → `PROCESSING` → `COMPLETED` | `FAILED` (also `CANCELLED`). A job that will retry goes back to `QUEUED`.

## Key Patterns

### Provider Abstraction

All AI providers implement `VideoProvider` interface:

```typescript
interface VideoProvider {
  name: string;
  generateVideo(
    endpoint: string,
    request: GenerationRequest,
    options?: GenerateOptions // requestId to resume, onSubmitted to save it
  ): Promise<GenerationResult>;
}
```

Throw for transient errors (the job retries and resumes the same provider request). Return `{ success: false, retryable }` for a failed request; `retryable: false` fails the job without another paid attempt.

### Admin Auth Check

Admin routes use NextAuth session check against `ADMIN_EMAILS` env var.

### R2 Storage Structure

```
videos/{videoId}.mp4        # Manual uploads keep their type: .mov / .webm
images/{uuid}.jpeg
thumbnails/{videoId}.jpg
uploads/{uuid}.{ext}        # Staging for direct-to-R2 manual uploads, deleted after
```

All objects are written with `Cache-Control: immutable`; a new file gets a new key.

### Slug-based URLs

Comparisons use human-readable slugs: `/comparisons/dancing-robot-sunset`

## Environment Variables

Required in `.env`:

```
DATABASE_URL          # PostgreSQL connection
REDIS_URL             # Redis connection
R2_ACCOUNT_ID         # Cloudflare account
R2_ACCESS_KEY_ID      # R2 credentials
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL         # Public URL for videos (also needed at build time for next/image)
NEXTAUTH_URL          # App URL
NEXTAUTH_SECRET       # Auth secret
GITHUB_ID/SECRET      # OAuth (optional)
GOOGLE_CLIENT_ID/SECRET # OAuth (optional)
FAL_KEY               # fal.ai API key
RUNWAY_API_KEY        # Runway API key (optional)
ADMIN_EMAILS          # Comma-separated admin emails
CLIENT_IP_HEADER      # Optional: trusted client-IP header, e.g. cf-connecting-ip
```

## Common Tasks

### Add a new AI model

1. Add to `prisma/seed.ts` with provider, endpoint, capabilities
2. Run `pnpm db:seed`

### Retry failed video generation

- UI: Click retry button on failed video card
- API: `POST /api/videos/[id]/retry`

### Add new provider

1. Create `src/lib/providers/{name}.ts` implementing `VideoProvider`
2. Register in `src/lib/providers/registry.ts`
3. Add provider record to database

### Manual video upload

Use the `/admin/upload` form. It uploads straight to R2 (`POST /api/upload/video/presign`, PUT, then `POST /api/upload/video/complete`) and falls back to multipart `POST /api/upload/video` if the direct upload fails (e.g. no R2 CORS rule). MP4, MOV and WebM only.

### After changing public data

Call `revalidatePublicData()` (or `revalidateVotedVideo()`) from `lib/data/public.ts`; public pages are cached for up to 60s otherwise.

## API Endpoints

See the API reference in `README.md`. Admin routes validate bodies with the zod schemas in `lib/admin-input.ts`.

## Debugging

- **Queue issues**: Check `/admin/jobs` or Redis directly
- **Video generation**: Check `Video.apiResponse` JSON field for raw API response
- **Auth issues**: Verify `ADMIN_EMAILS` includes your OAuth email
- **R2 issues**: Check the R2 dashboard; direct uploads need a CORS rule (see `.env.example`)

## Notes

- Most models use fal.ai API (single SDK for many models)
- Some models (Luma Ray 3, Pika 2.5) are manual-only (no API)
- Videos are downloaded from provider and re-uploaded to R2
- Thumbnails generated server-side with FFmpeg at 10% timestamp
- Anonymous voting uses a signed voter cookie + IP hash to prevent duplicates

## Important

- Use `gh` CLI for all git commands.
- Be extremely concise. Sacrifice grammar for the sake of concision.
