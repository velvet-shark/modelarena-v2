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
src/
├── app/
│   ├── (public)/           # Public routes (no auth required)
│   │   ├── page.tsx        # Homepage
│   │   ├── comparisons/    # Browse & view comparisons
│   │   └── models/         # Browse & view models
│   ├── admin/              # Admin routes (auth required)
│   │   ├── generate/       # Create new comparison
│   │   ├── comparisons/    # Manage comparisons
│   │   ├── upload/         # Manual video upload
│   │   └── jobs/           # Queue monitoring
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── video-grid.tsx      # Main video comparison grid
│   └── ...
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── auth.ts             # NextAuth configuration
│   ├── providers/          # AI provider abstractions
│   │   ├── types.ts        # VideoProvider interface
│   │   ├── fal.ts          # fal.ai implementation
│   │   ├── runway.ts       # Runway implementation
│   │   └── registry.ts     # Provider lookup
│   ├── storage/r2.ts       # Cloudflare R2 client
│   ├── queue/              # BullMQ setup
│   └── thumbnails/         # FFmpeg thumbnail generation
└── types/                  # Shared TypeScript types
```

## Database Schema (Key Tables)

- **Provider**: API providers (fal.ai, runway, manual)
- **Model**: AI models with endpoints and capabilities
- **Comparison**: A benchmark with prompt, source image, visibility settings
- **Video**: Generated video with metrics (time, cost, status, R2 URLs)
- **Vote**: Anonymous votes (fingerprint + IP hash)
- **Job**: Queue job records for debugging

**Video Statuses:** `PENDING` → `QUEUED` → `PROCESSING` → `COMPLETED` | `FAILED`

## Key Patterns

### Provider Abstraction

All AI providers implement `VideoProvider` interface:

```typescript
interface VideoProvider {
  name: string;
  generateVideo(endpoint: string, request: GenerationRequest): Promise<GenerationResult>;
}
```

### Admin Auth Check

Admin routes use NextAuth session check against `ADMIN_EMAILS` env var.

### R2 Storage Structure

```
videos/{videoId}.mp4
images/{imageId}.jpg
thumbnails/{videoId}.jpg
```

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
R2_PUBLIC_URL         # Public URL for videos
NEXTAUTH_URL          # App URL
NEXTAUTH_SECRET       # Auth secret
GITHUB_ID/SECRET      # OAuth (optional)
GOOGLE_CLIENT_ID/SECRET # OAuth (optional)
FAL_KEY               # fal.ai API key
RUNWAY_API_KEY        # Runway API key (optional)
ADMIN_EMAILS          # Comma-separated admin emails
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

Use `/admin/upload` form or `POST /api/upload` with multipart form data

## API Endpoints

| Method | Path                   | Auth   | Purpose           |
| ------ | ---------------------- | ------ | ----------------- |
| GET    | /api/comparisons       | Public | List comparisons  |
| POST   | /api/comparisons       | Admin  | Create comparison |
| GET    | /api/comparisons/[id]  | Public | Get comparison    |
| POST   | /api/videos/[id]/retry | Admin  | Retry failed      |
| POST   | /api/videos/[id]/vote  | Public | Submit vote       |
| POST   | /api/upload            | Admin  | Manual upload     |

## Debugging

- **Queue issues**: Check `/admin/jobs` or Redis directly
- **Video generation**: Check `Video.apiResponse` JSON field for raw API response
- **Auth issues**: Verify `ADMIN_EMAILS` includes your OAuth email
- **R2 issues**: Test with `pnpm r2:test` or check R2 dashboard

## Notes

- Most models use fal.ai API (single SDK for many models)
- Some models (Luma Ray 3, Pika 2.5) are manual-only (no API)
- Videos are downloaded from provider and re-uploaded to R2
- Thumbnails generated server-side with FFmpeg at 10% timestamp
- Anonymous voting uses FingerprintJS + IP hash to prevent duplicates

## Important

- Use `gh` CLI for all git commands.
- Be extremely concise. Sacrifice grammar for the sake of concision.
