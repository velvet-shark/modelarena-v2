# ModelArena - AI Video Generation Comparison Platform

**ModelArena** is a comprehensive platform for benchmarking and comparing AI video generation models side-by-side. Test multiple models (Kling, Runway, Veo, Sora, Hailuo, Luma, Pika, and more) using identical prompts and source images to objectively compare quality, speed, and cost.

## Features

- 🎬 **Multi-Model Comparison**: Run the same prompt across 20+ AI video models simultaneously
- 🖼️ **Image-to-Video & Text-to-Video**: Support for both generation types
- ⚡ **Queue-Based Processing**: Reliable job processing with BullMQ and Redis
- 📊 **Analytics Dashboard**: Track performance metrics, generation times, and costs
- 🗳️ **Anonymous Voting**: Community-driven quality assessment with fingerprint-based voting
- 🎯 **Model Leaderboards**: See which models perform best across different metrics
- 🔍 **Advanced Search**: Filter comparisons by type, tags, and search terms
- 📱 **Mobile Optimized**: Responsive design with optimized video playback
- 🔐 **Admin Panel**: Secure admin interface for managing comparisons and models
- 🚀 **Self-Hosted**: Deploy on your own infrastructure with Docker

## Tech Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| **Framework**  | Next.js 15 (App Router)          |
| **Language**   | TypeScript                       |
| **Database**   | PostgreSQL + Prisma ORM          |
| **Storage**    | Cloudflare R2 (S3-compatible)    |
| **Queue**      | Redis + BullMQ                   |
| **Auth**       | NextAuth.js v5 (GitHub/Google)   |
| **Styling**    | Tailwind CSS + shadcn/ui         |
| **Thumbnails** | FFmpeg (server-side)             |
| **Charts**     | Recharts                         |
| **Deployment** | Docker / Coolify / Self-hosted   |

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL 16+
- Redis 7+
- FFmpeg (for thumbnail generation)
- Cloudflare R2 account (or S3-compatible storage)
- fal.ai API key
- (Optional) Runway API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/modelarena-v2.git
cd modelarena-v2
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

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
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

# OAuth Providers (at least one required for admin access)
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"
# OR
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Providers
FAL_KEY="your-fal-api-key"
RUNWAY_API_KEY="your-runway-api-key" # Optional

# Admin Access (comma-separated emails)
ADMIN_EMAILS="your-email@example.com,admin@example.com"
```

4. **Set up the database**

```bash
# Push schema to database
pnpm db:push

# Seed initial data (providers, models, capabilities)
pnpm db:seed
```

5. **Start the development server**

```bash
# Terminal 1: Start Next.js dev server
pnpm dev

# Terminal 2: Start BullMQ worker
pnpm worker
```

6. **Access the application**

- Public site: http://localhost:3000
- Admin panel: http://localhost:3000/admin (requires OAuth sign-in)

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

### Environment Variables for Production

Update your `.env` file with production values:

- Set `NEXTAUTH_URL` to your production domain
- Use production database and Redis instances
- Configure R2 with custom domain for better performance
- Set secure `NEXTAUTH_SECRET`

## Usage

### Creating a Comparison

1. Sign in to the admin panel (`/admin`)
2. Navigate to "Generate New Comparison"
3. Choose comparison type:
   - **Image-to-Video**: Upload a source image + add motion prompt
   - **Text-to-Video**: Describe the video you want to generate
4. Select models to compare (select all or pick specific ones)
5. Add tags for organization
6. Click "Generate Comparison"

The system will:

- Create a comparison record
- Queue jobs for each selected model
- Process jobs in parallel (5 concurrent by default)
- Download generated videos and upload to R2
- Generate thumbnails automatically
- Update status in real-time

### Managing Comparisons

- **Edit**: Update title, description, tags, visibility (`/admin/comparisons/[id]`)
- **Retry Failed Videos**: Click retry button on failed generations
- **Bulk Operations**: Select multiple comparisons and publish/feature/delete
- **Search & Filter**: Use search box and filters on comparisons list

### Manual Video Upload

For models without API access (e.g., Luma Ray 3, Pika 2.5):

1. Navigate to `/admin/upload`
2. Select an existing comparison or create new
3. Choose the model
4. Upload the video file
5. (Optional) Add metadata like generation time

### Monitoring

- **Job Queue**: Monitor at `/admin/jobs` with real-time updates
- **Health Check**: `GET /api/health` returns system status
- **Analytics**: Public analytics at `/analytics`

## API Reference

### Public Endpoints

| Endpoint                       | Method | Description              |
| ------------------------------ | ------ | ------------------------ |
| `/api/comparisons`             | GET    | List public comparisons  |
| `/api/comparisons/[id]`        | GET    | Get comparison by ID     |
| `/api/comparisons/slug/[slug]` | GET    | Get comparison by slug   |
| `/api/models`                  | GET    | List active models       |
| `/api/models/[slug]`           | GET    | Get model details        |
| `/api/tags`                    | GET    | List all tags            |
| `/api/videos/[id]/vote`        | POST   | Vote for video           |
| `/api/videos/[id]/vote`        | DELETE | Remove vote              |
| `/api/health`                  | GET    | Health check (DB, Redis) |

### Admin Endpoints (Authentication Required)

| Endpoint                 | Method | Description                  |
| ------------------------ | ------ | ---------------------------- |
| `/api/comparisons`       | POST   | Create comparison            |
| `/api/comparisons/[id]`  | PATCH  | Update comparison            |
| `/api/comparisons/[id]`  | DELETE | Delete comparison            |
| `/api/videos/[id]/retry` | POST   | Retry failed generation      |
| `/api/upload/image`      | POST   | Upload source image          |
| `/api/upload/video`      | POST   | Manual video upload          |
| `/api/admin/models`      | GET    | List all models (+ inactive) |
| `/api/admin/models`      | POST   | Create model                 |
| `/api/admin/models/[id]` | PATCH  | Update model                 |
| `/api/admin/models/[id]` | DELETE | Delete model                 |
| `/api/jobs`              | GET    | List jobs                    |
| `/api/jobs/stream`       | GET    | SSE stream for jobs          |

## Project Structure

```
modelarena-v2/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public pages (no auth)
│   │   ├── page.tsx       # Homepage
│   │   ├── comparisons/   # Browse & view comparisons
│   │   ├── models/        # Browse & view models
│   │   ├── analytics/     # Public analytics
│   │   └── tags/          # Tag pages
│   ├── admin/             # Admin pages (auth required)
│   │   ├── generate/      # Create comparison
│   │   ├── comparisons/   # Manage comparisons
│   │   ├── upload/        # Manual upload
│   │   ├── models/        # Model management
│   │   └── jobs/          # Queue monitoring
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── video-grid.tsx
│   ├── vote-button.tsx
│   └── ...
├── lib/                   # Core utilities
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # NextAuth config
│   ├── providers/        # AI provider abstractions
│   ├── storage/          # R2 client
│   ├── queue/            # BullMQ setup
│   └── thumbnails/       # FFmpeg utilities
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── worker/               # Standalone worker process
└── public/               # Static assets
```

## Development

### Available Scripts

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
```

### Adding a New Model

1. Edit `prisma/seed.ts`
2. Add model configuration:

```typescript
{
  slug: "your-model-slug",
  name: "Your Model Name",
  provider: "fal.ai", // or "runway", "manual"
  endpoint: "fal-ai/your-model-id",
  capabilities: ["image-to-video"], // or ["text-to-video"]
}
```

3. Run `pnpm db:seed`

### Adding a New Provider

1. Create `lib/providers/your-provider.ts`
2. Implement `VideoProvider` interface
3. Register in `lib/providers/registry.ts`
4. Add API key to `.env`

## Configuration

### Queue Configuration

Edit `lib/queue/worker.ts`:

```typescript
const worker = new Worker<GenerationJobData>(
  "video-generation",
  processJob,
  {
    connection: redis,
    concurrency: 5, // Adjust based on your API limits
  }
);
```

### Rate Limiting

Configure in `lib/rate-limit.ts`:

```typescript
rateLimit(request, {
  interval: 60 * 1000, // Time window (ms)
  uniqueTokenPerInterval: 30, // Max requests
});
```

### File Upload Limits

Edit `next.config.ts`:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: "10mb", // Adjust as needed
  },
}
```

## Troubleshooting

### Videos not generating

1. Check worker is running: `pnpm worker`
2. Check Redis connection: `redis-cli ping`
3. View job errors at `/admin/jobs`
4. Check API keys in `.env`

### Database errors

1. Verify `DATABASE_URL` in `.env`
2. Run migrations: `pnpm db:push`
3. Check PostgreSQL is running

### R2 upload errors

1. Verify R2 credentials in `.env`
2. Check bucket exists and is accessible
3. Ensure R2_PUBLIC_URL is correct

### Auth issues

1. Verify OAuth app credentials
2. Check `ADMIN_EMAILS` includes your email
3. Clear browser cookies and re-authenticate

## Performance Optimization

- **Database**: All critical queries have indexes
- **Images**: Using Next.js Image component with optimization
- **Videos**: Lazy loading with `preload="metadata"`
- **API**: Rate limiting on public endpoints
- **Caching**: Browser caching for static assets
- **CDN**: Use R2 custom domain with CDN for best performance

## Security

- **Authentication**: OAuth with email whitelist
- **Rate Limiting**: IP-based rate limiting on API routes
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection**: Protected by Prisma ORM
- **XSS**: React automatic escaping
- **CSRF**: NextAuth built-in protection

## Documentation

- **[PLAN.md](./PLAN.md)** - Complete technical specification and project roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Project guide and conventions for AI assistance

## Project Status

- ✅ Phase 1: Foundation (COMPLETED)
- ✅ Phase 2: Core Generation (COMPLETED)
- ✅ Phase 3: Public Interface (COMPLETED)
- ✅ Phase 4: Admin Features (COMPLETED)
- ✅ Phase 5: Enhanced Features (COMPLETED)
- ✅ Phase 6: Polish (COMPLETED)

See [PLAN.md](./PLAN.md) for detailed implementation notes.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI models via [fal.ai](https://fal.ai/) and [Runway](https://runwayml.com/)
- Storage by [Cloudflare R2](https://www.cloudflare.com/products/r2/)

---

Built with ❤️ for the AI video generation community
