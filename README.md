# ModelArena

AI Video Generation Comparison Platform - benchmarking multiple AI video models side-by-side.

## Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment**
   ```bash
   # Edit .env (already created)
   # Add your GitHub email to ADMIN_EMAILS
   # Add GitHub OAuth credentials (see SETUP.md)
   ```

   **For production (Coolify)**: Set environment variables in Coolify UI

3. **Set up database**
   ```bash
   # Push schema to database
   pnpm db:push

   # Seed initial models
   pnpm db:seed
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

Visit http://localhost:3000

## Project Status

### ✅ Phase 1: Foundation (COMPLETED)
- Next.js 15 project with TypeScript
- PostgreSQL with Prisma ORM
- Cloudflare R2 integration
- NextAuth with OAuth (GitHub)
- Basic admin layout and authentication

### 🔄 Phase 2: Core Generation (TODO)
- Provider abstraction layer
- Redis and BullMQ setup
- fal.ai provider implementation
- Comparison creation flow
- Job queue and worker
- Video upload to R2
- Thumbnail generation

See [PLAN.md](./PLAN.md) for full implementation details.

## Documentation

- **[PLAN.md](./PLAN.md)** - Complete technical specification
- **[CLAUDE.md](./CLAUDE.md)** - Project guide and conventions

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma
- **Storage**: Cloudflare R2
- **Queue**: Redis + BullMQ
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui
