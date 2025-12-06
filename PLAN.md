# ModelArena - AI Video Generation Comparison Platform

## Project Status

**Last Updated**: December 6, 2025

**Current Phase**: Phase 6 - Polish ✅ COMPLETED

**MVP Status**: ✅ Complete (All Phases 1-6)

### Phase 1: Foundation ✅ COMPLETED
- ✅ Next.js 15 project with TypeScript
- ✅ PostgreSQL with Prisma ORM
- ✅ Cloudflare R2 integration (client configured)
- ✅ NextAuth v5 with OAuth (GitHub)
- ✅ Basic admin layout and authentication

### Phase 2: Core Generation ✅ COMPLETED
- ✅ Provider abstraction layer
- ✅ Redis and BullMQ setup
- ✅ fal.ai provider implementation
- ✅ Comparison creation flow (with image-to-video & text-to-video support)
- ✅ Job queue and worker process
- ✅ Video upload to R2
- ✅ Image upload to R2 with validation
- ✅ Thumbnail generation with FFmpeg
- ✅ Admin generate UI with type selector and image upload
- ✅ Admin comparisons list and detail pages
- ✅ API routes for comparison, retry, and image upload
- ✅ UI components (Input, Label, Textarea, Checkbox, RadioGroup)

### Phase 3: Public Interface ✅ COMPLETED
- ✅ Homepage with featured and recent comparisons
- ✅ Comparison browse page with type and tag filters
- ✅ Single comparison view with video grid and Play All button
- ✅ Model listing page (grouped by provider)
- ✅ Single model detail page with stats and recent videos
- ✅ Tag system with filtering and dedicated tags page
- ✅ API routes: GET /api/comparisons/[id], GET /api/comparisons/slug/[slug], GET /api/models, GET /api/models/[slug], GET /api/tags

### Phase 4: Admin Features ✅ COMPLETED
### Phase 5: Enhanced Features ✅ COMPLETED
### Phase 6: Polish ✅ COMPLETED

---

## Overview

ModelArena is a platform for benchmarking and comparing AI video generation models. It allows administrators to run side-by-side comparisons of multiple AI models using the same prompts and source images, then publicly showcase the results for easy comparison.

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | Next.js 15 (App Router) | Full-stack React framework with SSR, API routes, server actions |
| **Backend** | Node.js / TypeScript | Unified language, excellent fal.ai SDK support |
| **Database** | PostgreSQL | Robust relational DB for structured data and complex queries |
| **ORM** | Prisma | Type-safe database access, migrations, great DX |
| **Video Storage** | Cloudflare R2 | S3-compatible, no egress fees, generous free tier |
| **Job Queue** | Redis + BullMQ | Reliable job processing with retries, progress tracking |
| **Authentication** | NextAuth.js v5 | OAuth with GitHub for admin access |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development with consistent design |
| **Deployment** | Coolify | Self-hosted PaaS with easy git-push deployments |
| **Thumbnails** | FFmpeg | Server-side thumbnail generation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js App                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Public UI   │  │   Admin UI   │  │    API Routes        │  │
│  │  - Browse    │  │  - Generate  │  │  - /api/comparisons  │  │
│  │  - Compare   │  │  - Upload    │  │  - /api/videos       │  │
│  │  - Vote      │  │  - Manage    │  │  - /api/jobs         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │     Redis     │    │ Cloudflare R2 │
│  - Models     │    │  - Job Queue  │    │  - Videos     │
│  - Videos     │    │  - Cache      │    │  - Images     │
│  - Prompts    │    │               │    │  - Thumbnails │
└───────────────┘    └───────────────┘    └───────────────┘
                              │
                              ▼
                     ┌───────────────┐
                     │  BullMQ Worker│
                     │  - fal.ai     │
                     │  - Runway     │
                     │  - Direct APIs│
                     └───────────────┘
```

---

## Database Schema

### Core Tables

```prisma
// prisma/schema.prisma

model Provider {
  id          String   @id @default(cuid())
  name        String   @unique  // "fal.ai", "runway", "manual"
  displayName String
  apiKeyEnv   String?  // Environment variable name for API key
  models      Model[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Model {
  id           String       @id @default(cuid())
  slug         String       @unique  // "kling-2.5-turbo-pro"
  name         String       // "Kling 2.5 Turbo Pro"
  provider     Provider     @relation(fields: [providerId], references: [id])
  providerId   String
  endpoint     String?      // API endpoint or fal.ai model ID
  capabilities Capability[] // ["image-to-video", "text-to-video"]
  isActive     Boolean      @default(true)
  costPerSecond Float?      // Estimated cost per second of video
  defaultParams Json?       // Default generation parameters
  videos       Video[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Capability {
  id     String  @id @default(cuid())
  name   String  @unique  // "image-to-video", "text-to-video"
  models Model[]
}

model Comparison {
  id           String   @id @default(cuid())
  slug         String   @unique  // URL-friendly slug
  title        String   // "Dancing Robot at Sunset"
  description  String?
  type         String   // "image-to-video", "text-to-video"
  prompt       String   @db.Text
  sourceImageId String?
  sourceImage  SourceImage? @relation(fields: [sourceImageId], references: [id])
  isPublic     Boolean  @default(false)
  isFeatured   Boolean  @default(false)
  videos       Video[]
  tags         Tag[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([type])
  @@index([isPublic])
  @@index([createdAt])
}

model SourceImage {
  id          String       @id @default(cuid())
  filename    String
  r2Key       String       // R2 object key
  url         String       // Public URL
  width       Int?
  height      Int?
  comparisons Comparison[]
  createdAt   DateTime     @default(now())
}

model Video {
  id            String     @id @default(cuid())
  comparison    Comparison @relation(fields: [comparisonId], references: [id], onDelete: Cascade)
  comparisonId  String
  model         Model      @relation(fields: [modelId], references: [id])
  modelId       String

  // Video file details
  r2Key         String?    // R2 object key
  url           String?    // Public URL
  thumbnailKey  String?    // R2 key for thumbnail
  thumbnailUrl  String?
  duration      Float?     // Duration in seconds
  width         Int?
  height        Int?
  fileSize      Int?       // Size in bytes

  // Generation metrics
  status        VideoStatus @default(PENDING)
  generationTime Float?     // Time in seconds
  cost          Float?      // Actual cost if available
  errorMessage  String?     @db.Text

  // API response metadata
  apiRequestId  String?
  apiResponse   Json?      // Raw API response for debugging

  // Manual upload support
  isManual      Boolean    @default(false)
  manualMetadata Json?     // Manually entered metadata

  // Voting
  votes         Vote[]
  voteCount     Int        @default(0)

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@unique([comparisonId, modelId, createdAt])
  @@index([status])
  @@index([comparisonId])
  @@index([modelId])
}

enum VideoStatus {
  PENDING
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

model Vote {
  id        String   @id @default(cuid())
  video     Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  videoId   String

  // Anonymous voting with fingerprint to prevent duplicates
  fingerprint String  // Browser fingerprint hash
  ipHash      String  // Hashed IP for rate limiting

  createdAt DateTime @default(now())

  @@unique([videoId, fingerprint])
  @@index([videoId])
}

model Tag {
  id          String       @id @default(cuid())
  name        String       @unique
  slug        String       @unique
  comparisons Comparison[]
}

model Job {
  id           String    @id @default(cuid())
  type         String    // "generate", "upload", "thumbnail"
  status       String    @default("pending")
  payload      Json
  result       Json?
  error        String?   @db.Text
  attempts     Int       @default(0)
  maxAttempts  Int       @default(3)
  videoId      String?
  comparisonId String?
  createdAt    DateTime  @default(now())
  startedAt    DateTime?
  completedAt  DateTime?

  @@index([status])
  @@index([videoId])
}
```

---

## API Provider Abstraction

### Provider Interface

```typescript
// src/lib/providers/types.ts

export interface GenerationRequest {
  prompt: string;
  sourceImageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  seed?: number;
  additionalParams?: Record<string, unknown>;
}

export interface GenerationResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  cost?: number;
  generationTime: number;
  apiRequestId?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface VideoProvider {
  name: string;
  generateVideo(modelEndpoint: string, request: GenerationRequest): Promise<GenerationResult>;
  checkStatus?(requestId: string): Promise<GenerationResult>;
  estimateCost?(request: GenerationRequest): number;
}
```

### Provider Implementations

```typescript
// src/lib/providers/fal.ts
import * as fal from "@fal-ai/serverless-client";

export class FalProvider implements VideoProvider {
  name = "fal.ai";

  async generateVideo(modelEndpoint: string, request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const result = await fal.subscribe(modelEndpoint, {
        input: {
          prompt: request.prompt,
          image_url: request.sourceImageUrl,
          duration: request.duration,
          aspect_ratio: request.aspectRatio,
          seed: request.seed,
          ...request.additionalParams,
        },
        logs: true,
        onQueueUpdate: (update) => {
          // Can emit progress events here
        },
      });

      const generationTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        videoUrl: result.video?.url,
        duration: result.video?.duration,
        width: result.video?.width,
        height: result.video?.height,
        generationTime,
        rawResponse: result,
      };
    } catch (error) {
      return {
        success: false,
        generationTime: (Date.now() - startTime) / 1000,
        error: error.message,
      };
    }
  }
}

// src/lib/providers/runway.ts
export class RunwayProvider implements VideoProvider {
  name = "runway";

  async generateVideo(modelEndpoint: string, request: GenerationRequest): Promise<GenerationResult> {
    // Runway-specific implementation
    // Uses their REST API with polling for completion
  }
}

// src/lib/providers/manual.ts
export class ManualProvider implements VideoProvider {
  name = "manual";

  async generateVideo(): Promise<GenerationResult> {
    throw new Error("Manual provider does not support automatic generation");
  }
}
```

### Provider Registry

```typescript
// src/lib/providers/registry.ts

const providers: Map<string, VideoProvider> = new Map([
  ["fal.ai", new FalProvider()],
  ["runway", new RunwayProvider()],
  ["manual", new ManualProvider()],
]);

export function getProvider(name: string): VideoProvider {
  const provider = providers.get(name);
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}
```

---

## Job Queue System

### Queue Setup

```typescript
// src/lib/queue/index.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL);

export const generationQueue = new Queue("video-generation", { connection });

export interface GenerationJobData {
  videoId: string;
  comparisonId: string;
  modelId: string;
  prompt: string;
  sourceImageUrl?: string;
  modelEndpoint: string;
  providerName: string;
}

// Worker process (runs separately or in same process)
const worker = new Worker<GenerationJobData>(
  "video-generation",
  async (job) => {
    const { videoId, modelEndpoint, providerName, prompt, sourceImageUrl } = job.data;

    // Update video status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "PROCESSING" },
    });

    const provider = getProvider(providerName);
    const result = await provider.generateVideo(modelEndpoint, {
      prompt,
      sourceImageUrl,
    });

    if (result.success) {
      // Download video and upload to R2
      const r2Result = await uploadVideoToR2(result.videoUrl, videoId);

      // Generate thumbnail
      const thumbnailResult = await generateThumbnail(r2Result.localPath, videoId);

      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "COMPLETED",
          url: r2Result.url,
          r2Key: r2Result.key,
          thumbnailUrl: thumbnailResult.url,
          thumbnailKey: thumbnailResult.key,
          duration: result.duration,
          width: result.width,
          height: result.height,
          generationTime: result.generationTime,
          cost: result.cost,
          apiResponse: result.rawResponse,
        },
      });
    } else {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "FAILED",
          errorMessage: result.error,
          generationTime: result.generationTime,
        },
      });
    }

    return result;
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs simultaneously
  }
);
```

---

## Cloudflare R2 Integration

### R2 Client

```typescript
// src/lib/storage/r2.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // Custom domain or R2.dev URL

export async function uploadVideo(buffer: Buffer, key: string): Promise<{ url: string; key: string }> {
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `videos/${key}`,
    Body: buffer,
    ContentType: "video/mp4",
  }));

  return {
    key: `videos/${key}`,
    url: `${PUBLIC_URL}/videos/${key}`,
  };
}

export async function uploadImage(buffer: Buffer, key: string): Promise<{ url: string; key: string }> {
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `images/${key}`,
    Body: buffer,
    ContentType: "image/jpeg",
  }));

  return {
    key: `images/${key}`,
    url: `${PUBLIC_URL}/images/${key}`,
  };
}

export async function uploadThumbnail(buffer: Buffer, key: string): Promise<{ url: string; key: string }> {
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `thumbnails/${key}`,
    Body: buffer,
    ContentType: "image/jpeg",
  }));

  return {
    key: `thumbnails/${key}`,
    url: `${PUBLIC_URL}/thumbnails/${key}`,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}
```

---

## Thumbnail Generation

```typescript
// src/lib/thumbnails/generate.ts
import ffmpeg from "fluent-ffmpeg";
import { uploadThumbnail } from "../storage/r2";
import { tmpdir } from "os";
import { join } from "path";
import { unlink } from "fs/promises";

export async function generateThumbnail(
  videoPath: string,
  videoId: string
): Promise<{ url: string; key: string }> {
  const tempPath = join(tmpdir(), `thumb-${videoId}.jpg`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timestamps: ["10%"], // Take screenshot at 10% of video
        filename: `thumb-${videoId}.jpg`,
        folder: tmpdir(),
        size: "480x?", // 480px width, maintain aspect ratio
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const buffer = await readFile(tempPath);
  const result = await uploadThumbnail(buffer, `${videoId}.jpg`);

  // Cleanup temp file
  await unlink(tempPath);

  return result;
}
```

---

## Page Structure

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with featured comparisons and recent additions |
| `/comparisons` | Browse all public comparisons with filters |
| `/comparisons/[slug]` | Single comparison page with video grid |
| `/models` | List of all models with stats |
| `/models/[slug]` | Single model page with all its videos |
| `/tags/[slug]` | Comparisons filtered by tag |

### Admin Pages (Protected)

| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard with stats and quick actions |
| `/admin/generate` | Create new comparison with model selection |
| `/admin/comparisons` | Manage all comparisons |
| `/admin/comparisons/[id]` | Edit comparison, retry failed videos |
| `/admin/upload` | Manual video upload form |
| `/admin/models` | Manage models and providers |
| `/admin/jobs` | View job queue status |

---

## Key Features Implementation

### 1. Comparison Generation Flow

```
Admin enters prompt + selects models
            │
            ▼
   Create Comparison record
            │
            ▼
   Create Video records (PENDING) for each model
            │
            ▼
   Add jobs to BullMQ queue
            │
            ▼
   Worker processes jobs in parallel
            │
   ┌────────┴────────┐
   ▼                 ▼
Success           Failure
   │                 │
   ▼                 │
Download video       │
Upload to R2         │
Generate thumbnail   │
Update record        ▼
            Mark as FAILED
            Store error message
```

### 2. Retry Failed Generation

```typescript
// src/app/api/videos/[id]/retry/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { model: { include: { provider: true } }, comparison: true },
  });

  if (video.status !== "FAILED") {
    return Response.json({ error: "Video is not in failed state" }, { status: 400 });
  }

  // Reset status and add to queue
  await prisma.video.update({
    where: { id: params.id },
    data: { status: "QUEUED", errorMessage: null },
  });

  await generationQueue.add("generate", {
    videoId: video.id,
    comparisonId: video.comparisonId,
    modelId: video.modelId,
    prompt: video.comparison.prompt,
    sourceImageUrl: video.comparison.sourceImage?.url,
    modelEndpoint: video.model.endpoint,
    providerName: video.model.provider.name,
  });

  return Response.json({ success: true });
}
```

### 3. Video Grid Component

```tsx
// src/components/video-grid.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface VideoGridProps {
  videos: Video[];
  showMetrics?: boolean;
}

export function VideoGrid({ videos, showMetrics = true }: VideoGridProps) {
  const [playing, setPlaying] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Synchronized playback option
  const playAll = () => {
    videoRefs.current.forEach((video) => {
      video.currentTime = 0;
      video.play();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={playAll}>Play All</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            ref={(el) => el && videoRefs.current.set(video.id, el)}
            showMetrics={showMetrics}
          />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, showMetrics }: { video: Video; showMetrics: boolean }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="aspect-video relative">
        {video.status === "COMPLETED" ? (
          <video
            src={video.url}
            poster={video.thumbnailUrl}
            controls
            className="w-full h-full object-cover"
          />
        ) : video.status === "PROCESSING" ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <Spinner /> Processing...
          </div>
        ) : video.status === "FAILED" ? (
          <div className="flex flex-col items-center justify-center h-full bg-destructive/10">
            <AlertCircle className="text-destructive" />
            <span className="text-sm">{video.errorMessage}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <Clock /> Pending...
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="font-medium">{video.model.name}</div>

        {showMetrics && video.status === "COMPLETED" && (
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>⏱️ {video.generationTime?.toFixed(1)}s</span>
            {video.cost && <span>💰 ${video.cost.toFixed(3)}</span>}
            <span>📐 {video.width}×{video.height}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Anonymous Voting System

```typescript
// src/lib/voting.ts
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { createHash } from "crypto";

export async function getVoterIdentity(): Promise<{ fingerprint: string; ipHash: string }> {
  // Get browser fingerprint
  const fp = await FingerprintJS.load();
  const result = await fp.get();

  return {
    fingerprint: result.visitorId,
    ipHash: "", // Will be set server-side
  };
}

// API route
export async function POST(req: Request) {
  const { videoId, fingerprint } = await req.json();
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  try {
    await prisma.vote.create({
      data: {
        videoId,
        fingerprint,
        ipHash,
      },
    });

    // Update vote count
    await prisma.video.update({
      where: { id: videoId },
      data: { voteCount: { increment: 1 } },
    });

    return Response.json({ success: true });
  } catch (error) {
    // Unique constraint violation = already voted
    if (error.code === "P2002") {
      return Response.json({ error: "Already voted" }, { status: 409 });
    }
    throw error;
  }
}
```

---

## Models Configuration

### Initial Model Seed Data

```typescript
// prisma/seed.ts

const models = [
  // Kling
  {
    slug: "kling-2.5-turbo-standard",
    name: "Kling 2.5 Turbo Standard",
    provider: "fal.ai",
    endpoint: "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "kling-2.5-turbo-pro",
    name: "Kling 2.5 Turbo Pro",
    provider: "fal.ai",
    endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "kling-o1",
    name: "Kling AI O1",
    provider: "fal.ai",
    endpoint: "fal-ai/kling-video/o1/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Runway
  {
    slug: "runway-gen4-turbo",
    name: "Runway Gen-4 Turbo",
    provider: "runway",
    endpoint: "gen4_turbo",
    capabilities: ["image-to-video"],
  },

  // Veo
  {
    slug: "veo-3.1-reference",
    name: "Veo 3.1 Reference",
    provider: "fal.ai",
    endpoint: "fal-ai/veo3.1/reference-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "veo-3.1-fast",
    name: "Veo 3.1 Fast",
    provider: "fal.ai",
    endpoint: "fal-ai/veo3.1/fast/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "veo-3.1",
    name: "Veo 3.1",
    provider: "fal.ai",
    endpoint: "fal-ai/veo3.1/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Sora
  {
    slug: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "fal.ai",
    endpoint: "fal-ai/sora-2/image-to-video/pro",
    capabilities: ["image-to-video"],
  },
  {
    slug: "sora-2",
    name: "Sora 2",
    provider: "fal.ai",
    endpoint: "fal-ai/sora-2/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Hailuo / MiniMax
  {
    slug: "hailuo-2.3-pro",
    name: "Hailuo 2.3 Pro",
    provider: "fal.ai",
    endpoint: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "hailuo-2.3-standard",
    name: "Hailuo 2.3 Standard",
    provider: "fal.ai",
    endpoint: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "hailuo-2.3-fast-standard",
    name: "Hailuo 2.3 Fast Standard",
    provider: "fal.ai",
    endpoint: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "hailuo-2.3-fast-pro",
    name: "Hailuo 2.3 Fast Pro",
    provider: "fal.ai",
    endpoint: "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Wan
  {
    slug: "wan-2.5-preview",
    name: "Wan 2.5 Preview",
    provider: "fal.ai",
    endpoint: "fal-ai/wan-25-preview/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Seedance
  {
    slug: "seedance-1.0-pro-fast",
    name: "Seedance 1.0 Pro Fast",
    provider: "fal.ai",
    endpoint: "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
    capabilities: ["image-to-video"],
  },

  // Vidu
  {
    slug: "vidu-q2-turbo",
    name: "Vidu Q2 Turbo",
    provider: "fal.ai",
    endpoint: "fal-ai/vidu/q2/image-to-video/turbo",
    capabilities: ["image-to-video"],
  },
  {
    slug: "vidu-q2-pro",
    name: "Vidu Q2 Pro",
    provider: "fal.ai",
    endpoint: "fal-ai/vidu/q2/image-to-video/pro",
    capabilities: ["image-to-video"],
  },
  {
    slug: "vidu-q2-reference",
    name: "Vidu Q2 Reference",
    provider: "fal.ai",
    endpoint: "fal-ai/vidu/q2/reference-to-video",
    capabilities: ["image-to-video"],
  },

  // Luma
  {
    slug: "luma-ray-2-flash",
    name: "Luma Ray 2 Flash",
    provider: "fal.ai",
    endpoint: "fal-ai/luma-dream-machine/ray-2-flash/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "luma-ray-2",
    name: "Luma Ray 2",
    provider: "fal.ai",
    endpoint: "fal-ai/luma-dream-machine/ray-2/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "luma-ray-3",
    name: "Luma Ray 3",
    provider: "manual",
    endpoint: null,
    capabilities: ["image-to-video"],
  },

  // Pika
  {
    slug: "pika-2.2",
    name: "Pika 2.2",
    provider: "fal.ai",
    endpoint: "fal-ai/pika/v2.2/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "pika-2-turbo",
    name: "Pika 2 Turbo",
    provider: "fal.ai",
    endpoint: "fal-ai/pika/v2/turbo/image-to-video",
    capabilities: ["image-to-video"],
  },
  {
    slug: "pika-2.5",
    name: "Pika 2.5",
    provider: "manual",
    endpoint: null,
    capabilities: ["image-to-video"],
  },
];
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
R2_PUBLIC_URL="https://your-custom-domain.com" # or R2.dev URL

# NextAuth
NEXTAUTH_URL="https://modelarena.yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Providers
FAL_KEY="your-fal-api-key"
RUNWAY_API_KEY="your-runway-api-key"

# Admin whitelist (comma-separated emails)
ADMIN_EMAILS="your-email@example.com"
```

---

## Deployment with Coolify

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=modelarena
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install FFmpeg for thumbnail generation
RUN apk add --no-cache ffmpeg

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## Project Structure

```
modelarena/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                    # Homepage
│   │   │   ├── comparisons/
│   │   │   │   ├── page.tsx                # Browse comparisons
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx            # Single comparison
│   │   │   ├── models/
│   │   │   │   ├── page.tsx                # Browse models
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx            # Single model
│   │   │   └── tags/
│   │   │       └── [slug]/
│   │   │           └── page.tsx            # Tag filter
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Admin layout with auth check
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── generate/
│   │   │   │   └── page.tsx                # Create comparison
│   │   │   ├── comparisons/
│   │   │   │   ├── page.tsx                # Manage comparisons
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Edit comparison
│   │   │   ├── upload/
│   │   │   │   └── page.tsx                # Manual upload
│   │   │   ├── models/
│   │   │   │   └── page.tsx                # Manage models
│   │   │   └── jobs/
│   │   │       └── page.tsx                # Job queue
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── comparisons/
│   │   │   │   ├── route.ts                # CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── videos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── retry/
│   │   │   │       │   └── route.ts
│   │   │   │       └── vote/
│   │   │   │           └── route.ts
│   │   │   ├── models/
│   │   │   │   └── route.ts
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── jobs/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   ├── video-grid.tsx
│   │   ├── video-card.tsx
│   │   ├── comparison-form.tsx
│   │   ├── model-selector.tsx
│   │   ├── upload-form.tsx
│   │   ├── performance-chart.tsx
│   │   ├── vote-button.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── prisma.ts                       # Prisma client
│   │   ├── auth.ts                         # NextAuth config
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── fal.ts
│   │   │   ├── runway.ts
│   │   │   ├── manual.ts
│   │   │   └── registry.ts
│   │   ├── storage/
│   │   │   └── r2.ts
│   │   ├── queue/
│   │   │   ├── index.ts
│   │   │   └── worker.ts
│   │   ├── thumbnails/
│   │   │   └── generate.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── worker/
│   └── index.ts                            # Standalone worker process
├── public/
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.worker
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
- ✅ Set up Next.js project with TypeScript
- ✅ Configure PostgreSQL with Prisma
- ✅ Set up Cloudflare R2 integration
- ✅ Implement NextAuth with OAuth
- ✅ Create basic admin layout and authentication

**Notes**:
- Using NextAuth v5 beta with updated auth() API
- Prisma schema includes all models from specification
- Admin authentication uses email whitelist from ADMIN_EMAILS env var
- R2 client ready but requires environment variables to be configured

### Phase 2: Core Generation ✅ COMPLETED
- ✅ Implement provider abstraction layer
- ✅ Set up Redis and BullMQ
- ✅ Implement fal.ai provider (covers most models)
- ✅ Build comparison creation flow
- ✅ Add job queue and worker process
- ✅ Implement video upload to R2
- ✅ Implement image upload to R2
- ✅ Add thumbnail generation with FFmpeg
- ✅ Build admin generate UI with type selector and image upload
- ✅ Create admin comparisons management pages
- ✅ Implement retry functionality for failed videos

**What Was Built**:

*Provider System*:
- Provider abstraction supports fal.ai, runway (stub), and manual upload
- VideoProvider interface with GenerationRequest/GenerationResult types
- Provider registry for dynamic provider lookup

*Job Queue*:
- BullMQ worker processes jobs with 5 concurrent jobs by default
- Exponential backoff retry strategy (3 attempts, 5s initial delay)
- Job cleanup: keeps last 100 completed, 500 failed for debugging
- Standalone worker process: `pnpm worker`

*API Routes*:
- POST /api/comparisons - Create comparison with multiple models
- GET /api/comparisons - List all comparisons (supports public filter)
- POST /api/videos/[id]/retry - Retry failed video generation
- POST /api/upload/image - Upload source images (max 10MB, validates types)

*Admin UI*:
- /admin/generate - Create comparisons with type selector (image-to-video/text-to-video)
- /admin/comparisons - List all comparisons with status overview
- /admin/comparisons/[id] - Detailed view with video grid and retry buttons
- Model selector grouped by provider with select all/deselect all
- Image upload with preview and drag-and-drop UI

*Components*:
- GenerateForm - Main comparison creation form with validation
- VideoRetryButton - Interactive retry with loading states
- UI primitives: Input, Label, Textarea, Checkbox, RadioGroup

*Video Generation Flow*:
API → Queue → Worker → Provider → R2 → Thumbnail → DB

**Technical Learnings**:
- Next.js 15 requires async params: `params: Promise<{ id: string }>`
- Extract FormData before async operations to avoid lost form references
- Image upload must complete before comparison creation (sequential flow)
- Prisma Json fields can't be set to `null` directly in updates (omit instead)
- R2 client needs explicit region: "auto" for Cloudflare

**Partially Implemented from Phase 4**:
- Comparison management interface (/admin/comparisons pages)
- Retry functionality (was planned for Phase 4 but needed for Phase 2 workflow)

### Phase 3: Public Interface ✅ COMPLETED
- ✅ Build homepage with featured comparisons
- ✅ Create comparison browse page with filters
- ✅ Implement single comparison view with video grid
- ✅ Add model listing pages
- ✅ Implement tag system

**What Was Built**:

*Public Pages*:
- / - Homepage with hero section, featured comparisons (up to 6), and recent comparisons (up to 12)
- /comparisons - Browse all public comparisons with type and tag filters
- /comparisons/[slug] - Single comparison view with video grid and Play All button
- /models - List all active models grouped by provider with stats
- /models/[slug] - Single model detail page with average metrics and recent videos
- /tags - Browse all tags with comparison counts

*API Routes*:
- GET /api/comparisons/[id] - Get single comparison by ID (public only)
- GET /api/comparisons/slug/[slug] - Get single comparison by slug (public only)
- GET /api/models - List all active models with completion counts
- GET /api/models/[slug] - Get single model by slug with videos and stats
- GET /api/tags - List all tags with public comparison counts

*Components*:
- PlayAllButton - Client component for synchronized video playback
- Reused existing Button, Link components from admin

*Features*:
- Homepage displays featured and recent comparisons with thumbnails
- Comparison browse page with type filter (image-to-video/text-to-video)
- Tag filtering on comparisons page
- Model pages show average generation time and duration
- Video grid with hover preview on model detail pages
- Breadcrumb navigation on all pages
- Responsive grid layouts (1/2/3/4 columns based on screen size)
- SEO-friendly server components throughout

**Technical Implementation**:
- All pages are Next.js server components for SEO
- Used Prisma with includes for efficient data fetching
- Only completed videos shown on public pages (status filter)
- Only public comparisons visible (isPublic: true filter)
- Featured comparisons prioritized in sorting
- Client component only for Play All button (minimal JS)
- Video hover preview on model pages using onMouseEnter/onMouseLeave
- Slug-based URLs for better SEO (/comparisons/dancing-robot instead of /comparisons/clx123)

**UI/UX Highlights**:
- Consistent header across all pages with navigation
- Empty states for pages with no data
- Loading states implicit via Next.js
- Hover effects on cards for better interactivity
- Featured badge on featured comparisons
- Tag pills for easy navigation
- Video thumbnails as fallback to source images
- Stats displayed prominently (generation time, resolution, duration)

### Phase 4: Admin Features ✅ COMPLETED
- ✅ Enhanced admin dashboard with comprehensive stats
- ✅ Create comparison management interface (Done in Phase 2)
- ✅ Add retry functionality for failed videos (Done in Phase 2)
- ✅ Implemented manual upload form at /admin/upload
- ✅ Added job queue monitoring page at /admin/jobs
- ✅ Built model management interface at /admin/models
- ✅ Implemented comparison edit/update functionality
- ✅ Added bulk operations (delete, publish, feature)
- ✅ Implemented advanced filtering and search for comparisons

**What Was Built**:

*Enhanced Admin Dashboard* (/admin):
- Comprehensive overview stats (comparisons, videos, models, processing count)
- Video status breakdown (pending, queued, processing, completed, failed)
- Job queue stats with status counts
- Recent comparisons list with completion progress
- Quick action buttons (New Comparison, Upload Video)
- Links to job monitoring and comparisons pages

*Manual Upload Form* (/admin/upload):
- Select existing comparison or upload to new one
- Model selection dropdown (all active models)
- Video file upload with validation (max 500MB, video types only)
- Optional metadata fields (generation time, cost, duration, notes)
- Automatic thumbnail generation using FFmpeg
- Automatic video metadata extraction (width, height, duration)
- Upload to R2 with progress indication

*Job Queue Monitoring* (/admin/jobs):
- Real-time job status table (pending, active, completed, failed)
- Filter by job status
- Auto-refresh toggle (5-second intervals)
- Job details (ID, type, attempts, duration, error messages)
- Links to related videos and comparisons
- Manual refresh button

*Model Management* (/admin/models):
- List all models (including inactive)
- Add new models with provider selection
- Edit model details (name, endpoint, cost, capabilities)
- Toggle active/inactive status
- Delete models (only if no videos exist)
- Capability management (image-to-video, text-to-video)
- Video count per model
- API endpoints: GET/POST /api/admin/models, PATCH/DELETE /api/admin/models/[id]

*Comparison Edit/Update* (/admin/comparisons/[id]):
- Inline edit form on comparison detail page
- Update title, description, public/featured status
- Tag management with checkboxes
- Delete comparison with cascade (removes all videos)
- API endpoints: GET/PATCH/DELETE /api/comparisons/[id]

*Bulk Operations* (/admin/comparisons):
- Multi-select comparisons with checkboxes
- Select all/deselect all
- Bulk actions: Publish, Unpublish, Feature, Unfeature, Delete
- Confirmation dialogs for destructive actions
- Visual feedback for selected items

*Advanced Filtering & Search* (/admin/comparisons):
- Search by title, prompt, or description (live filtering)
- Filter by type (image-to-video, text-to-video)
- Filter by status (public, private, featured)
- Result count display
- Filters work with bulk operations (select all filtered)

*API Routes Created*:
- GET/POST /api/admin/models - List/create models
- PATCH/DELETE /api/admin/models/[id] - Update/delete models
- GET /api/admin/providers - List providers
- GET /api/admin/capabilities - List capabilities
- GET /api/jobs - List jobs with filtering
- POST /api/upload/video - Manual video upload
- PATCH /api/comparisons/[id] - Update comparison
- DELETE /api/comparisons/[id] - Delete comparison

*UI Components Created*:
- Select component (Radix UI based)
- ComparisonEditForm - Inline comparison editor
- ComparisonsListBulk - List with bulk operations and filters

**Technical Implementation**:
- Server components for initial data loading (dashboard, lists)
- Client components for interactive features (forms, filters, selections)
- Optimistic updates with router.refresh() for better UX
- Proper auth checks on all admin API routes
- FFmpeg integration for thumbnail generation from uploaded videos
- File validation for uploads (type, size)
- Cascade deletes handled by Prisma schema
- Bulk operations use Promise.all for parallel API calls

**Technical Learnings**:
- Event handlers (onMouseEnter, onMouseLeave) require client components - created ModelVideoGrid component
- Select component needed manual implementation with Radix UI primitives
- Bulk operations benefit from client-side state management with useMemo for filtering
- Manual video upload requires separate thumbnail generation flow (local file vs URL)
- Router.refresh() provides good UX for optimistic updates without full page reload
- Promise.all enables efficient parallel API calls for bulk operations
- File operations in API routes need proper cleanup (temp files) even on error

### Phase 5: Enhanced Features ✅ COMPLETED
- ✅ Implemented anonymous voting system with FingerprintJS
- ✅ Added performance charts and visualizations with Recharts
- ✅ Built search functionality for comparisons
- ✅ Implemented Runway direct API provider
- ✅ Implemented real-time job status updates with SSE

**What Was Built**:

*Anonymous Voting System*:
- VoteButton component with fingerprint-based voting
- POST/DELETE /api/videos/[id]/vote endpoints
- Browser fingerprint + IP hash for duplicate prevention
- Local storage for client-side vote state tracking
- Vote counts displayed on comparison and model pages
- Integrated into comparison detail and model video grids

*Performance Charts & Analytics*:
- PerformanceCharts component using Recharts library
- /analytics public page with comprehensive metrics
- Charts: Average generation time, success rate, vote leaderboard, video duration
- Summary stats: Total models, videos, completed count, total votes
- Model performance aggregation and filtering (top 10)
- Responsive charts with proper labels and tooltips

*Search Functionality*:
- ComparisonSearch component with debounced input (300ms)
- Full-text search across title, description, and prompt
- Case-insensitive search using Prisma contains + mode
- Search integrated with existing type and tag filters
- Real-time URL updates with search params

*Runway Direct API Provider*:
- Full RunwayProvider implementation with polling
- Two-step process: Create task → Poll for completion
- Timeout after 10 minutes (120 attempts × 5s interval)
- Support for image-to-video and text-to-video
- Error handling and detailed API responses
- API version header: X-Runway-Version: 2024-11-06

*Real-time Job Status Updates*:
- Server-Sent Events (SSE) implementation
- GET /api/jobs/stream endpoint with auth check
- useJobStream custom hook for client-side connection
- Live connection indicator (green/red dot)
- Stats dashboard: Pending, Active, Completed, Failed counts
- Updates every 3 seconds with automatic reconnection
- Toggle for real-time on/off
- Filtered job list with live updates

**Components Created**:
- components/vote-button.tsx - Vote/unvote with fingerprint
- components/performance-charts.tsx - Recharts visualizations
- components/comparison-search.tsx - Debounced search input
- hooks/use-job-stream.ts - SSE connection hook

**API Routes Created**:
- POST/DELETE /api/videos/[id]/vote - Voting endpoints
- GET /api/jobs/stream - SSE stream for job updates

**Pages Created**:
- app/analytics/page.tsx - Public analytics dashboard

**Technical Implementation**:
- FingerprintJS for anonymous user identification
- Recharts for data visualization
- Server-Sent Events for real-time updates
- Prisma case-insensitive search with OR conditions
- Runway API with exponential backoff retry pattern
- EventSource API for SSE client connection
- LocalStorage for vote persistence

**Technical Learnings**:
- SSE requires careful cleanup on component unmount
- EventSource automatically reconnects on error
- Recharts needs ResponsiveContainer for proper sizing
- FingerprintJS fingerprint is stable across sessions
- Runway API uses polling pattern vs fal.ai subscribe
- Debouncing search prevents excessive API calls
- Vote duplicate prevention needs both fingerprint + IP hash
- API routes must be in `app/api/` not `src/app/api/` (this project uses `app/` directory structure)
- Next.js dev server may need restart after adding new API routes

**Bug Fixes**:
- Fixed vote route 404 error by moving from `src/app/api/` to `app/api/`

### Phase 6: Polish ✅ COMPLETED
- ✅ Error boundaries for graceful error handling
- ✅ Loading skeletons for better UX
- ✅ Mobile video player optimization
- ✅ Next.js Image component integration
- ✅ SEO meta tags (Open Graph, Twitter Cards)
- ✅ Rate limiting middleware
- ✅ Prisma query optimization with indexes
- ✅ Health check endpoint
- ✅ Comprehensive README documentation

**What Was Built**:

*Error Boundaries*:
- Root error boundary (app/error.tsx)
- Admin-specific error boundary (app/admin/error.tsx)
- Comparison error boundary (app/comparisons/error.tsx)
- Model error boundary (app/models/error.tsx)
- Graceful error display with retry functionality

*Loading States*:
- Loading skeletons for all major pages
- Homepage skeleton with grid layout
- Comparison list and detail loading states
- Model list and detail loading states
- Admin dashboard loading state
- Proper animation with pulse effect

*Mobile Optimization*:
- Video elements with playsInline attribute
- preload="metadata" for better mobile performance
- Responsive grid layouts tested on mobile
- Touch-friendly controls

*Image Optimization*:
- Next.js Image component for source images
- Proper width/height attributes
- Priority loading for above-fold images
- Automatic optimization and lazy loading

*SEO Enhancements*:
- Root layout with comprehensive metadata
- Open Graph tags for social sharing
- Twitter Card support
- Dynamic metadata for comparison pages
- Proper title templates
- Keywords and author meta tags
- Robots and sitemap configuration

*Rate Limiting*:
- IP-based rate limiting utility (lib/rate-limit.ts)
- In-memory rate limit store
- Applied to voting endpoints (10 requests/minute)
- Configurable interval and token limits
- Automatic cleanup of old entries
- 429 response with Retry-After header

*Database Optimization*:
- Added indexes on Model.isActive
- Added indexes on Model.providerId
- Added indexes on Comparison.isFeatured
- Compound indexes on Comparison (isPublic + createdAt)
- Compound indexes on Comparison (isFeatured + createdAt)
- Added indexes on Video.voteCount
- Compound indexes on Video (status + comparisonId)
- Added indexes on Job.comparisonId and Job.createdAt

*Health Check*:
- GET /api/health endpoint
- Database connection check
- Redis connection check
- Returns 200 (healthy) or 503 (degraded)
- JSON response with check details
- Timestamp included

*Documentation*:
- Comprehensive README.md
- Quick start guide
- Docker deployment instructions
- API reference
- Troubleshooting guide
- Configuration examples
- Development workflow
- Project structure overview

**Technical Implementation**:
- Error boundaries are client components with useEffect
- Loading states use Next.js automatic Suspense
- Rate limiting uses Map with TTL cleanup
- Health check uses Prisma $queryRaw for DB ping
- SEO uses Next.js Metadata API with generateMetadata
- Image optimization uses next/image with remote patterns

**Technical Learnings**:
- Error boundaries must be client components ('use client')
- Loading.tsx automatically creates Suspense boundaries
- Metadata can be static or dynamic (generateMetadata function)
- Rate limiting in serverless needs in-memory or Redis store
- Next.js Image requires width/height or fill property
- playsInline crucial for iOS video autoplay
- Compound indexes improve query performance significantly
- Project has mixed structure: some libs in /lib, others in /src/lib (queue, providers, thumbnails in src)
- Import paths must match actual file locations: @/src/lib/queue not @/lib/queue

**Bug Fixes**:
- Fixed health check endpoint import path from @/lib/queue to @/src/lib/queue

---

## Automated Cost Calculation System ✅ COMPLETED

### Overview

Comprehensive cost tracking system that automatically calculates video generation costs based on configurable pricing models. Supports 4 pricing structures with intelligent cost formatting.

### Pricing Models Supported

1. **Per-Second Pricing**
   - Cost = duration × pricePerSecond
   - Optional audio variants (different pricing with/without audio)
   - Example: Veo 3.1 Fast ($0.10/s no audio, $0.15/s with audio)

2. **Base + Per-Second Pricing**
   - Cost = basePrice + (extraSeconds × pricePerExtraSecond)
   - Includes base duration covered by basePrice
   - Example: Kling 2.5 Turbo Standard ($0.21 base for 5s + $0.042/s extra)

3. **Flat-Rate Pricing**
   - Cost = fixed price (regardless of duration)
   - Example: Hailuo 2.3 Pro ($0.49 per generation)

4. **Resolution-Dependent Pricing**
   - Cost varies by video resolution tier
   - Can be per-second or flat-rate within each tier
   - Example: Sora 2 Pro ($0.30/s at 720p, $0.50/s at 1080p)

### Implementation Architecture

**Storage Location**: `Model.defaultParams.pricing` (JSON field)

**Fallback**: `Model.costPerSecond` for simple models during migration

**Cost Calculation Flow**:
1. Worker completes video generation
2. Fetches Model record with pricing config
3. Calls CostCalculator with video metrics (duration, resolution, audio)
4. Saves calculated cost to Video.cost field

### Files Created

**Core Pricing System**:
- `src/lib/pricing/types.ts` - TypeScript interfaces for all pricing models
- `src/lib/pricing/calculator.ts` - CostCalculator class with calculation logic
- `src/lib/pricing/validation.ts` - Zod schemas for runtime validation
- `src/lib/pricing/index.ts` - Barrel export
- `src/lib/format-cost.ts` - Intelligent cost formatting utility

**API & Components**:
- `app/api/videos/[id]/route.ts` - PATCH endpoint for manual cost override
- `components/video-cost-editor.tsx` - Inline cost editor for admin
- `components/pricing-config-editor.tsx` - Full pricing configuration UI

**Integration**:
- `src/lib/queue/worker.ts` - Modified to calculate costs after generation
- `prisma/seed.ts` - Updated with pricing configs for all 22 models
- `app/admin/models/page.tsx` - Integrated pricing editor

### Features

**Automatic Cost Calculation**:
- Worker automatically calculates costs after successful generation
- Uses actual video metadata (duration, width, height)
- Logs cost breakdown and warnings
- Falls back to costPerSecond if no pricing config

**Manual Cost Entry & Override**:
- Upload form accepts manual cost input
- Admin can edit costs on generated videos
- Inline cost editor with click-to-edit UI
- Useful for outdated pricing or manual uploads

**Pricing Configuration UI**:
- Admin panel pricing editor (`/admin/models`)
- Supports all 4 pricing model types
- Audio pricing variants toggle
- Resolution tier management
- Estimated pricing flag

**Intelligent Cost Formatting**:
- Always shows at least 2 decimals (e.g., $0.70)
- Shows 3rd and 4th decimals only if non-zero
- Strips trailing zeros beyond 2nd decimal
- Examples: $0.5512, $0.881, $0.35, $0.70

**Public Display**:
- Cost shown on comparison pages
- Cost shown on model detail pages
- Average cost displayed on model pages
- Consistent formatting everywhere

### Pricing Data

All models seeded with pricing configurations:

**Per-Second Models (8)**:
- Veo 3.1 Fast, Veo 3.1, Veo 3.1 Reference
- Sora 2
- Kling O1
- Runway Gen-4 Turbo
- Vidu Q2 Turbo
- Seedance 1.0 Pro Fast

**Base + Per-Second Models (3)**:
- Kling 2.5 Turbo Standard
- Kling 2.5 Turbo Pro
- Vidu Q2 Pro

**Flat-Rate Models (8)**:
- Hailuo 2.3 Pro, Standard, Fast Pro, Fast Standard
- Luma Ray 2, Ray 2 Flash
- Pika 2 Turbo

**Resolution-Dependent Models (3)**:
- Sora 2 Pro
- Wan 2.5 Preview
- Pika 2.2

**Estimated Pricing**: Models with estimated pricing clearly flagged with `isEstimated: true`

### Technical Implementation

**Type Safety**: Full TypeScript interfaces with union types for pricing configs

**Runtime Validation**: Zod schemas validate pricing data

**Database Integration**: JSON field in Prisma with type casting

**Worker Integration**: Cost calculation happens automatically post-generation

**Error Handling**: Fallback to costPerSecond on calculation errors

**Formatting Utility**: Shared formatCost() function used across all displays

### Benefits

- **Automated**: No manual cost entry needed for most videos
- **Flexible**: Supports complex pricing models from different providers
- **Accurate**: Uses actual video metrics, not estimates
- **Maintainable**: Easy to update pricing via admin UI or seed
- **Transparent**: Costs visible on public site for comparison
- **Auditable**: Cost calculation logged for debugging

---

## Current State & Production Readiness

### ✅ MVP Complete - All 6 Phases Implemented

The platform is **production-ready** with all core features implemented:

- **Video Generation**: Multi-model comparison with 20+ AI models
- **Job Processing**: Reliable queue system with retry logic
- **Public Interface**: Browse, search, filter, and vote on comparisons
- **Admin Panel**: Full CRUD, bulk operations, model management
- **Analytics**: Performance metrics and leaderboards
- **Polish**: Error handling, loading states, SEO, mobile optimization

### Production Deployment Checklist

Before deploying to production:

1. **Environment Setup**:
   - [ ] Set all environment variables in production
   - [ ] Configure NEXTAUTH_SECRET with secure random value
   - [ ] Set NEXTAUTH_URL to production domain
   - [ ] Add admin emails to ADMIN_EMAILS
   - [ ] Verify R2 bucket is configured with public access
   - [ ] Test OAuth providers (GitHub/Google) with production URLs

2. **Database**:
   - [ ] Run `pnpm db:push` or `pnpm db:migrate` in production
   - [ ] Run `pnpm db:seed` to initialize models
   - [ ] Verify all indexes are created (check with \d+ table_name in psql)
   - [ ] Set up automated backups

3. **Infrastructure**:
   - [ ] Start worker process (`pnpm worker`) as separate service
   - [ ] Configure Redis for persistence (AOF or RDB)
   - [ ] Set up monitoring for health check endpoint (/api/health)
   - [ ] Configure CDN for R2 bucket (optional but recommended)
   - [ ] Set up log aggregation (consider Sentry, Datadog, or similar)

4. **Performance**:
   - [ ] Test under load (concurrent job processing)
   - [ ] Monitor queue depth and worker concurrency
   - [ ] Verify rate limiting is working
   - [ ] Check database query performance

5. **Security**:
   - [ ] Verify admin access is restricted to ADMIN_EMAILS
   - [ ] Test rate limiting on voting endpoints
   - [ ] Ensure no sensitive data in client-side code
   - [ ] Configure CORS if needed for API access

### Known Limitations & Considerations

1. **File Structure**:
   - Mixed structure with files in both `/lib` and `/src/lib`
   - Recommendation: Consolidate to single location in future refactor
   - Current state: Queue, providers, thumbnails in `/src/lib`; auth, prisma, rate-limit in `/lib`

2. **Rate Limiting**:
   - Current implementation uses in-memory Map
   - Not suitable for multi-instance deployments
   - Recommendation: Migrate to Redis-based rate limiting for horizontal scaling

3. **Worker Scaling**:
   - Single worker process with configurable concurrency
   - Recommendation: Deploy multiple worker instances for high-volume scenarios
   - Consider adding worker health checks and auto-restart

4. **Storage**:
   - Videos uploaded to R2 without transcoding
   - Recommendation: Add video transcoding for consistent formats/sizes
   - Consider adding video compression to reduce storage costs

5. **Error Logging**:
   - Currently using console.error
   - Recommendation: Integrate Sentry or similar for production error tracking
   - Add request ID tracking for debugging

### Recommended Optimizations

**Short-term (Next 1-2 weeks)**:
- Add Sentry for error tracking
- Set up monitoring dashboards (Grafana/Datadog)
- Implement Redis-based rate limiting
- Add video transcoding pipeline
- Create database migration workflow (move from db:push to migrations)

**Medium-term (Next 1-3 months)**:
- Consolidate file structure (/lib vs /src/lib)
- Add WebSocket support for live generation progress
- Implement caching layer (Redis) for frequently accessed data
- Add automated testing (E2E with Playwright)
- Create admin API keys for programmatic access

**Long-term (3+ months)**:
- Add user accounts with OAuth (for vote history, favorites)
- Implement comparison request system (users suggest prompts)
- Add cost tracking and budgets per provider
- Build custom provider plugin system
- Add GraphQL API alternative to REST

### Post-MVP Features & Enhancements

**User Engagement**:
- User accounts with OAuth (optional, for vote history and favorites)
- Comments/discussion on comparisons
- Social sharing with preview cards
- Email notifications for new comparisons (subscribe feature)
- Comparison request system (users suggest prompts/models)
- Leaderboard page with various rankings (speed, quality votes, consistency)

**Advanced Analytics**:
- Model head-to-head comparison view
- Historical performance trends over time
- Cost efficiency analysis (cost per vote, cost per second)
- A/B testing framework for prompt variations
- Export analytics data to CSV/JSON
- Comparison quality scoring algorithm

**Content Management**:
- Batch comparison creation (CSV upload)
- Scheduled comparisons (cron-based generation)
- Comparison templates (save prompt + model sets)
- Tag management UI (create, merge, delete tags)
- Featured comparison rotation (auto-rotate featured status)
- Archive old comparisons (soft delete)

**Technical Enhancements**:
- WebSocket support for live generation progress
- Video streaming optimization (adaptive bitrate)
- CDN integration for global video delivery
- Database read replicas for scaling
- Redis caching layer for API responses
- GraphQL API alternative to REST
- Webhook support for external integrations
- API rate limiting per user/IP
- Admin API keys for programmatic access

**Provider Integrations**:
- Add more providers (Stable Video Diffusion, Pika, etc.)
- Provider cost tracking and budgets
- Provider health monitoring and auto-failover
- Custom provider plugins system
- Provider-specific parameter tuning UI

**Quality of Life**:
- Keyboard shortcuts for navigation
- Dark mode theme
- Customizable grid layouts (2x2, 3x3, etc.)
- Video download buttons
- Comparison duplicate detection
- Bulk video re-generation
- Model comparison favorites/presets
- Advanced filtering (date range, duration, resolution)

**Monetization (if applicable)**:
- Sponsor/partner model showcases
- Premium features (higher resolution, longer videos)
- API access tiers
- White-label instances

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| GET | `/api/comparisons` | List comparisons | Public | ✅ Phase 2 |
| POST | `/api/comparisons` | Create comparison | Admin | ✅ Phase 2 |
| GET | `/api/comparisons/[id]` | Get comparison by ID | Public | ✅ Phase 3 |
| GET | `/api/comparisons/slug/[slug]` | Get comparison by slug | Public | ✅ Phase 3 |
| PATCH | `/api/comparisons/[id]` | Update comparison | Admin | ✅ Phase 4 |
| DELETE | `/api/comparisons/[id]` | Delete comparison | Admin | ✅ Phase 4 |
| POST | `/api/videos/[id]/retry` | Retry failed video | Admin | ✅ Phase 2 |
| POST | `/api/videos/[id]/vote` | Vote for video | Public | ✅ Phase 5 |
| DELETE | `/api/videos/[id]/vote` | Remove vote | Public | ✅ Phase 5 |
| POST | `/api/upload/image` | Upload source image | Admin | ✅ Phase 2 |
| POST | `/api/upload/video` | Upload manual video | Admin | ✅ Phase 4 |
| GET | `/api/models` | List models | Public | ✅ Phase 3 |
| GET | `/api/models/[slug]` | Get model by slug | Public | ✅ Phase 3 |
| GET | `/api/admin/models` | List all models (incl. inactive) | Admin | ✅ Phase 4 |
| POST | `/api/admin/models` | Create model | Admin | ✅ Phase 4 |
| PATCH | `/api/admin/models/[id]` | Update model | Admin | ✅ Phase 4 |
| DELETE | `/api/admin/models/[id]` | Delete model | Admin | ✅ Phase 4 |
| GET | `/api/admin/providers` | List providers | Admin | ✅ Phase 4 |
| GET | `/api/admin/capabilities` | List capabilities | Admin | ✅ Phase 4 |
| GET | `/api/tags` | List tags | Public | ✅ Phase 3 |
| GET | `/api/jobs` | List jobs | Admin | ✅ Phase 4 |
| GET | `/api/jobs/stream` | SSE stream for real-time job updates | Admin | ✅ Phase 5 |

---

## Security Considerations

1. **Admin Authentication**: OAuth with email whitelist ensures only authorized users can access admin features
2. **Rate Limiting**: Implement rate limiting on API routes, especially voting
3. **Input Validation**: Validate all inputs with Zod schemas
4. **CSRF Protection**: NextAuth handles CSRF tokens automatically
5. **Secure Headers**: Configure security headers in Next.js config
6. **API Key Storage**: All API keys stored as environment variables, never in code
7. **Vote Fraud Prevention**: Browser fingerprint + IP hash combination prevents duplicate votes

---

## Cost Estimation

### Cloudflare R2 (Free Tier)
- 10 GB storage free
- Unlimited egress free
- After free tier: $0.015/GB storage, $0.00/GB egress

### Redis (Self-hosted)
- Included in VPS resources

### PostgreSQL (Self-hosted)
- Included in VPS resources

### AI API Costs (approximate per video)
- Most fal.ai models: $0.05 - $0.50 per generation
- Runway: ~$0.05 per second of video
- Varies significantly by model and duration

---

This plan provides a comprehensive foundation for building ModelArena. Ready to proceed with implementation?
