# ModelArena - AI Video Generation Comparison Platform

## Project Status

**Last Updated**: December 10, 2025

**Status**: Production Live

**MVP Status**: Complete - All Phases Implemented

---

## Overview

ModelArena is a platform for benchmarking and comparing AI video generation models. It allows administrators to run side-by-side comparisons of multiple AI models using the same prompts and source images, then publicly showcase the results for easy comparison.

**Live URL**: Production deployed and operational

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | Next.js 15 (App Router) | Full-stack React framework with SSR, API routes, server actions |
| **Backend** | Node.js / TypeScript | Unified language, excellent fal.ai SDK support |
| **Database** | PostgreSQL 16 | Robust relational DB for structured data and complex queries |
| **ORM** | Prisma | Type-safe database access, migrations, great DX |
| **Video Storage** | Cloudflare R2 | S3-compatible, no egress fees, generous free tier |
| **Job Queue** | Redis 7 + BullMQ | Reliable job processing with retries, progress tracking |
| **Authentication** | NextAuth.js v5 | OAuth with GitHub/Google for admin access |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development with consistent design |
| **Thumbnails** | FFmpeg | Server-side thumbnail generation |
| **Charts** | Recharts | Analytics visualizations |
| **Deployment** | Docker / Coolify | Self-hosted with health checks |

---

## Implementation Status

### Phase 1: Foundation - COMPLETED

- [x] Next.js 15 project with TypeScript
- [x] PostgreSQL with Prisma ORM
- [x] Cloudflare R2 integration
- [x] NextAuth v5 with OAuth (GitHub/Google)
- [x] Basic admin layout and authentication
- [x] Email whitelist for admin access

### Phase 2: Core Generation - COMPLETED

- [x] Provider abstraction layer (fal.ai, Runway, manual)
- [x] Redis and BullMQ setup
- [x] fal.ai provider implementation
- [x] Runway provider implementation with polling
- [x] Comparison creation flow (I2V & T2V)
- [x] Job queue with concurrent processing (5 jobs default)
- [x] Video upload to R2
- [x] Image upload to R2 with validation
- [x] Thumbnail generation with FFmpeg
- [x] Admin generate UI with type selector
- [x] Admin comparisons list and detail pages
- [x] Retry functionality for failed videos

### Phase 3: Public Interface - COMPLETED

- [x] Homepage with featured comparisons and masonry gallery
- [x] Comparison browse page with type and tag filters
- [x] Single comparison view with video grid
- [x] Play All synchronized playback
- [x] Model listing page (grouped by brand)
- [x] Single model detail page with stats
- [x] Tag system with filtering
- [x] SEO-friendly server components

### Phase 4: Admin Features - COMPLETED

- [x] Enhanced admin dashboard with stats
- [x] Manual video upload form
- [x] Job queue monitoring with SSE
- [x] Model management interface
- [x] Comparison edit/update functionality
- [x] Bulk operations (delete, publish, feature)
- [x] Advanced filtering and search
- [x] Add models to existing comparisons

### Phase 5: Enhanced Features - COMPLETED

- [x] Anonymous voting with FingerprintJS
- [x] Vote duplicate prevention (fingerprint + IP hash)
- [x] Performance charts with Recharts
- [x] Analytics dashboard
- [x] Search functionality with debouncing
- [x] Real-time job status updates (SSE)

### Phase 6: Polish - COMPLETED

- [x] Error boundaries for graceful handling
- [x] Loading skeletons for better UX
- [x] Mobile responsive design
- [x] Light theme only (no dark mode)
- [x] Next.js Image optimization
- [x] SEO meta tags (Open Graph, Twitter Cards)
- [x] Dynamic OG image generation
- [x] Favicon support
- [x] Rate limiting middleware
- [x] Database indexes optimization
- [x] Health check endpoint
- [x] Docker deployment configuration

### Phase 7: Cost System - COMPLETED

- [x] Automated cost calculation
- [x] 4 pricing models (per-second, base+per-second, flat-rate, resolution-dependent)
- [x] Audio pricing variants
- [x] Manual cost override
- [x] Intelligent cost formatting
- [x] Pricing configuration UI

---

## Database Schema

### Core Tables

```prisma
model Provider {
  id          String   @id @default(cuid())
  name        String   @unique  // "fal.ai", "runway", "manual"
  displayName String
  apiKeyEnv   String?
  models      Model[]
}

model Model {
  id            String       @id @default(cuid())
  slug          String       @unique
  name          String
  brand         String?      // Model maker: "Kling", "Veo", "Sora"
  provider      Provider     @relation
  providerId    String
  endpoint      String?      // I2V endpoint
  endpointT2V   String?      // T2V endpoint (if different)
  capabilities  Capability[]
  isActive      Boolean      @default(true)
  costPerSecond Float?
  defaultParams Json?        // Includes pricing configuration
  videos        Video[]
}

model Comparison {
  id            String       @id @default(cuid())
  slug          String       @unique
  title         String
  description   String?
  type          String       // "image-to-video", "text-to-video"
  prompt        String       @db.Text
  sourceImageId String?
  sourceImage   SourceImage?
  isPublic      Boolean      @default(false)
  isFeatured    Boolean      @default(false)
  aspectRatio   String?
  duration      Int?
  seed          Int?
  videos        Video[]
  tags          Tag[]
}

model Video {
  id             String      @id @default(cuid())
  comparison     Comparison
  comparisonId   String
  model          Model
  modelId        String
  r2Key          String?
  url            String?
  thumbnailKey   String?
  thumbnailUrl   String?
  duration       Float?
  width          Int?
  height         Int?
  fileSize       Int?
  status         VideoStatus @default(PENDING)
  generationTime Float?
  cost           Float?
  errorMessage   String?
  apiRequestId   String?
  apiResponse    Json?
  isManual       Boolean     @default(false)
  manualMetadata Json?
  votes          Vote[]
  voteCount      Int         @default(0)
}

enum VideoStatus {
  PENDING
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

### Database Indexes

Optimized indexes for query performance:
- `Model`: isActive, providerId, brand
- `Comparison`: type, isPublic, isFeatured, createdAt, compound indexes
- `Video`: status, comparisonId, modelId, voteCount, compound indexes
- `Job`: status, videoId, comparisonId, createdAt

---

## Supported Models (28 Total)

### By Brand

| Brand | Models | Provider |
|-------|--------|----------|
| **KlingAI** | Kling 2.6 Pro, 2.5 Turbo Pro, O1 | fal.ai |
| **Google Veo** | Veo 3.1, Veo 3.1 Fast, Veo 3 | fal.ai |
| **OpenAI Sora** | Sora 2, Sora 2 Pro | fal.ai |
| **MiniMax Hailuo** | 02 Pro/Standard, 2.3 Pro/Standard/Fast Pro | fal.ai |
| **Runway** | Gen-4 Turbo | fal.ai |
| **Alibaba Wan** | Wan 2.5 | fal.ai |
| **ByteDance Seedance** | 1.0 Pro, 1.0 Pro Fast | fal.ai |
| **Vidu** | Q2 Turbo, Q2 Pro, Q2 | fal.ai |
| **PixVerse** | V5.5 | fal.ai |
| **Pika Art** | Pika 2.2, Pika 2.5 (manual) | fal.ai/manual |
| **Luma Labs** | Ray 3 (manual) | manual |

### Models Without API (Manual Upload Only)
- Luma Ray 3
- Pika 2.5

---

## Pricing System

### Supported Pricing Models

1. **Per-Second**: `cost = duration × pricePerSecond`
   - Optional audio pricing variants
   - Example: Veo 3.1 Fast ($0.10/s)

2. **Base + Per-Second**: `cost = basePrice + (extraSeconds × pricePerExtraSecond)`
   - Base duration included in base price
   - Example: Kling 2.5 Turbo Standard ($0.21 base for 5s + $0.042/s)

3. **Flat-Rate**: Fixed cost per generation
   - Example: Hailuo 2.3 Pro ($0.49)

4. **Resolution-Dependent**: Tiered by resolution
   - Can be per-second or flat within each tier
   - Example: Sora 2 Pro ($0.30/s at 720p, $0.50/s at 1080p)

### Cost Formatting

Intelligent display formatting:
- Always shows at least 2 decimals
- Shows 3rd/4th decimals only if non-zero
- Examples: $0.5512, $0.881, $0.35, $0.70

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comparisons` | List public comparisons |
| GET | `/api/comparisons/[id]` | Get comparison by ID |
| GET | `/api/comparisons/slug/[slug]` | Get comparison by slug |
| GET | `/api/models` | List active models |
| GET | `/api/models/[slug]` | Get model details |
| GET | `/api/tags` | List all tags |
| POST | `/api/videos/[id]/vote` | Vote for video |
| DELETE | `/api/videos/[id]/vote` | Remove vote |
| GET | `/api/health` | Health check (DB, Redis) |

### Admin Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comparisons` | Create comparison |
| PATCH | `/api/comparisons/[id]` | Update comparison |
| DELETE | `/api/comparisons/[id]` | Delete comparison |
| PATCH | `/api/videos/[id]` | Update video (cost override) |
| POST | `/api/videos/[id]/retry` | Retry failed generation |
| DELETE | `/api/videos/[id]` | Delete video |
| POST | `/api/upload/image` | Upload source image |
| POST | `/api/upload/video` | Manual video upload |
| GET | `/api/admin/models` | List all models (+ inactive) |
| POST | `/api/admin/models` | Create model |
| PATCH | `/api/admin/models/[id]` | Update model |
| DELETE | `/api/admin/models/[id]` | Delete model |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/stream` | SSE stream for jobs |

---

## Project Structure

```
modelarena-v2/
├── app/
│   ├── page.tsx                    # Homepage with masonry gallery
│   ├── layout.tsx                  # Root layout with metadata
│   ├── comparisons/
│   │   ├── page.tsx                # Browse comparisons
│   │   └── [slug]/page.tsx         # Single comparison
│   ├── models/
│   │   ├── page.tsx                # Browse models (by brand)
│   │   └── [slug]/page.tsx         # Single model
│   ├── analytics/page.tsx          # Analytics dashboard
│   ├── tags/[slug]/page.tsx        # Tag filter
│   ├── admin/
│   │   ├── page.tsx                # Dashboard
│   │   ├── generate/page.tsx       # Create comparison
│   │   ├── comparisons/
│   │   │   ├── page.tsx            # Manage comparisons
│   │   │   └── [id]/page.tsx       # Edit comparison
│   │   ├── upload/page.tsx         # Manual upload
│   │   ├── models/page.tsx         # Model management
│   │   └── jobs/page.tsx           # Queue monitoring
│   └── api/                        # API routes
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── comparison-sidebar.tsx      # Left sidebar
│   ├── comparison-video-grid.tsx   # Video grid with sorting
│   ├── play-all-button.tsx         # Synchronized playback
│   ├── vote-button.tsx             # Anonymous voting
│   ├── performance-charts.tsx      # Analytics charts
│   ├── generate-form.tsx           # Generation form
│   └── ...
├── src/
│   └── lib/
│       ├── pricing/                # Cost calculation system
│       ├── providers/              # AI provider abstractions
│       ├── queue/                  # BullMQ setup
│       ├── storage/                # R2 client
│       └── thumbnails/             # FFmpeg utilities
├── lib/
│   ├── prisma.ts                   # Database client
│   ├── auth.ts                     # NextAuth config
│   └── rate-limit.ts               # Rate limiting
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Seed data (28 models)
├── worker/index.ts                 # BullMQ worker process
├── public/
│   ├── og-image.png                # Default OG image
│   └── favicon.svg                 # Favicon
├── Dockerfile                      # Production multi-stage
├── Dockerfile.worker               # Worker image
└── docker-compose.yml              # Development setup
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/modelarena"

# Redis
REDIS_URL="redis://localhost:6379"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="modelarena"
R2_PUBLIC_URL="https://your-r2-bucket.com"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth (at least one required)
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Providers
FAL_KEY="your-fal-api-key"
RUNWAY_API_KEY="your-runway-api-key"  # Optional

# Admin Access
ADMIN_EMAILS="admin@example.com,user@example.com"
```

---

## Setup Instructions

### Development Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd modelarena-v2
   pnpm install
   ```

2. **Start infrastructure**
   ```bash
   docker compose up -d postgres redis
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Setup database**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start development**
   ```bash
   # Terminal 1: Next.js
   pnpm dev

   # Terminal 2: Worker
   pnpm worker
   ```

### Production Deployment

1. **Using Docker Compose**
   ```bash
   docker compose up -d
   ```

2. **Health Check**
   ```
   GET /api/health
   Returns: { status: "healthy", checks: {...} }
   ```

3. **Database Migration**
   ```bash
   pnpm db:push  # or pnpm db:migrate for production
   pnpm db:seed
   ```

---

## Commands Reference

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript check

# Database
pnpm db:push          # Push schema changes (dev)
pnpm db:migrate       # Run migrations (prod)
pnpm db:seed          # Seed initial data
pnpm db:studio        # Open Prisma Studio

# Worker
pnpm worker           # Start BullMQ worker

# Docker
docker compose up -d          # Start all services
docker compose logs -f app    # View app logs
docker compose down           # Stop services
```

---

## Key Design Decisions

1. **Brand vs Provider**: `brand` field distinguishes model maker (Kling, Veo) from API provider (fal.ai). Models page groups by brand for user clarity.

2. **T2V Strategy**: Most models support T2V via fal.ai with separate `endpointT2V` field. Some models (Kling O1, reference variants) are I2V only.

3. **Sorting**: Default to votes descending everywhere. Surfaces best content first.

4. **Mobile Sidebar**: Collapsible accordion on mobile, fixed sidebar on desktop.

5. **Light Theme Only**: Single theme reduces complexity for MVP.

6. **Duration Default**: 5 seconds to minimize cost during testing.

7. **Admin Flexibility**: Admin sees all models regardless of video count.

8. **Anonymous Voting**: FingerprintJS + IP hash prevents duplicate votes without requiring accounts.

9. **Cost Calculation**: Automatic in worker, with manual override for corrections.

10. **File Structure**: Mixed `/lib` and `/src/lib` - queue/providers/thumbnails in `src/lib`, auth/prisma in `/lib`.

---

## Technical Learnings

### Next.js 15
- Async params required: `params: Promise<{ id: string }>`
- Extract FormData before async operations
- API routes must be in `app/api/`
- Loading.tsx creates automatic Suspense boundaries
- Error boundaries must be client components

### Prisma
- Json fields can't be set to `null` directly (omit instead)
- Compound indexes improve query performance significantly
- Use `$queryRaw` for health check DB ping

### R2 Storage
- Region must be "auto" for Cloudflare
- Path structure: `videos/`, `images/`, `thumbnails/`

### Video Generation
- Image upload must complete before comparison creation
- Runway uses polling pattern vs fal.ai subscribe
- FFmpeg needs `playsInline` for iOS video autoplay

### SSE Real-time Updates
- Requires careful cleanup on component unmount
- EventSource automatically reconnects on error

### Rate Limiting
- In-memory Map works for single instance
- Need Redis-based for horizontal scaling

---

## Future Enhancements

### Short-term
- [ ] Sentry error tracking
- [ ] Redis-based rate limiting
- [ ] Video transcoding pipeline
- [ ] Database migrations workflow

### Medium-term
- [ ] WebSocket for live progress
- [ ] Redis caching layer
- [ ] Automated E2E tests
- [ ] Admin API keys

### Long-term
- [ ] User accounts with OAuth
- [ ] Comparison request system
- [ ] Cost budgets per provider
- [ ] GraphQL API

---

## Security

- **Authentication**: OAuth with email whitelist (ADMIN_EMAILS)
- **Rate Limiting**: IP-based on public endpoints (10 req/min votes)
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection**: Protected by Prisma ORM
- **XSS**: React automatic escaping
- **CSRF**: NextAuth built-in protection
- **Vote Fraud**: Fingerprint + IP hash prevention

---

## Monitoring

- **Health Check**: `GET /api/health` - DB and Redis status
- **Job Queue**: `/admin/jobs` with real-time SSE updates
- **Logs**: Console logging (recommend Sentry for production)
- **Metrics**: Analytics page with performance charts
