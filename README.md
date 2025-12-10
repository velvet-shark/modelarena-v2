# ModelArena

**AI Video Generation Model Comparison Platform**

Compare 28+ AI video generation models side-by-side. Test Kling, Runway, Veo, Sora, Hailuo, Luma, Pika, and more using identical prompts to objectively compare quality, speed, and cost.

## Features

- **Multi-Model Comparison** - Run the same prompt across 28+ AI video models simultaneously
- **Image-to-Video & Text-to-Video** - Support for both generation types
- **Queue-Based Processing** - Reliable job processing with BullMQ and Redis
- **Automated Cost Tracking** - 4 pricing models (per-second, base+per-second, flat-rate, resolution-dependent)
- **Analytics Dashboard** - Track performance metrics, generation times, and costs
- **Anonymous Voting** - Community-driven quality assessment
- **Model Leaderboards** - See which models perform best
- **Advanced Search** - Filter by type, tags, and search terms
- **Mobile Optimized** - Responsive design with optimized video playback
- **Admin Panel** - Secure interface for managing comparisons and models
- **Self-Hosted** - Deploy on your own infrastructure with Docker

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Storage | Cloudflare R2 (S3-compatible) |
| Queue | Redis 7 + BullMQ |
| Auth | NextAuth.js v5 (GitHub/Google) |
| Styling | Tailwind CSS + shadcn/ui |
| Thumbnails | FFmpeg |
| Charts | Recharts |
| Deployment | Docker / Coolify |

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL 16+
- Redis 7+
- FFmpeg
- Cloudflare R2 account
- fal.ai API key

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/modelarena-v2.git
cd modelarena-v2

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Setup database
pnpm db:push
pnpm db:seed

# Start development
pnpm dev      # Terminal 1: Next.js
pnpm worker   # Terminal 2: BullMQ worker
```

Access at http://localhost:3000

### Environment Variables

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
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth (at least one required)
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"

# AI Providers
FAL_KEY="your-fal-api-key"
RUNWAY_API_KEY="your-runway-api-key"  # Optional

# Admin Access
ADMIN_EMAILS="your-email@example.com"
```

## Docker Deployment

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

## Usage

### Creating a Comparison

1. Sign in to admin panel (`/admin`)
2. Navigate to "Generate New Comparison"
3. Choose type: Image-to-Video or Text-to-Video
4. Select models to compare
5. Add prompt and optional source image
6. Click "Generate Comparison"

The system will queue jobs, process them in parallel, upload videos to R2, and generate thumbnails automatically.

### Managing Content

- **Edit comparisons**: `/admin/comparisons/[id]`
- **Retry failed videos**: Click retry button on failed cards
- **Bulk operations**: Select multiple and publish/feature/delete
- **Manual upload**: `/admin/upload` for models without API

### Monitoring

- **Job queue**: `/admin/jobs` with real-time updates
- **Health check**: `GET /api/health`
- **Analytics**: `/analytics`

## Supported Models (28)

| Brand | Models |
|-------|--------|
| KlingAI | Kling 2.6 Pro, 2.5 Turbo Pro, O1 |
| Google Veo | Veo 3.1, Veo 3.1 Fast, Veo 3 |
| OpenAI Sora | Sora 2, Sora 2 Pro |
| MiniMax Hailuo | 02 Pro/Standard, 2.3 Pro/Standard/Fast Pro |
| Runway | Gen-4 Turbo |
| Alibaba Wan | Wan 2.5 |
| ByteDance Seedance | 1.0 Pro, 1.0 Pro Fast |
| Vidu | Q2 Turbo, Q2 Pro, Q2 |
| PixVerse | V5.5 |
| Pika Art | Pika 2.2, Pika 2.5 (manual) |
| Luma Labs | Ray 3 (manual) |

## API Reference

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/comparisons` | GET | List public comparisons |
| `/api/comparisons/slug/[slug]` | GET | Get comparison by slug |
| `/api/models` | GET | List active models |
| `/api/models/[slug]` | GET | Model details |
| `/api/videos/[id]/vote` | POST/DELETE | Vote for video |
| `/api/health` | GET | Health check |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/comparisons` | POST | Create comparison |
| `/api/comparisons/[id]` | PATCH/DELETE | Update/delete comparison |
| `/api/videos/[id]/retry` | POST | Retry failed generation |
| `/api/upload/video` | POST | Manual video upload |
| `/api/admin/models` | GET/POST | List/create models |

## Project Structure

```
modelarena-v2/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage
│   ├── comparisons/       # Browse & view comparisons
│   ├── models/            # Browse & view models
│   ├── analytics/         # Performance charts
│   ├── admin/             # Admin pages
│   └── api/               # API routes
├── components/            # React components
├── src/lib/              # Core utilities
│   ├── pricing/          # Cost calculation
│   ├── providers/        # AI provider abstractions
│   ├── queue/            # BullMQ setup
│   └── storage/          # R2 client
├── prisma/               # Database schema & seed
├── worker/               # BullMQ worker process
├── Dockerfile            # Production image
├── Dockerfile.worker     # Worker image
└── docker-compose.yml    # Development setup
```

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript check

# Database
pnpm db:push          # Push schema changes
pnpm db:seed          # Seed initial data
pnpm db:studio        # Open Prisma Studio

# Worker
pnpm worker           # Start BullMQ worker
```

## Cost Tracking

ModelArena automatically calculates video generation costs:

1. **Per-Second**: `duration × rate`
2. **Base + Per-Second**: `base + (extra × rate)`
3. **Flat-Rate**: Fixed cost per generation
4. **Resolution-Dependent**: Tiered by resolution

Costs are calculated after generation using actual video metadata. Manual override available in admin panel.

## Troubleshooting

**Videos not generating**
- Check worker is running: `pnpm worker`
- Check Redis: `redis-cli ping`
- View job errors: `/admin/jobs`

**Database errors**
- Verify `DATABASE_URL`
- Run `pnpm db:push`

**Auth issues**
- Verify OAuth credentials
- Check `ADMIN_EMAILS` includes your email

## Documentation

- **[PLAN.md](./PLAN.md)** - Complete technical specification
- **[CLAUDE.md](./CLAUDE.md)** - Project conventions

## Security

- OAuth with email whitelist
- Rate limiting on public endpoints
- Input validation with Zod
- SQL injection protected by Prisma
- XSS protected by React
- CSRF protection via NextAuth

## License

MIT License

---

Built for the AI video generation community
