# ModelArena - AI Video Generation Comparison Platform

## Project Status

**Last Updated**: December 6, 2025

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

### Phase 3: Public Interface 📋 TODO
### Phase 4: Admin Features 📋 TODO
### Phase 5: Enhanced Features 📋 TODO
### Phase 6: Polish 📋 TODO

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

### Phase 3: Public Interface
- Build homepage with featured comparisons
- Create comparison browse page with filters
- Implement single comparison view with video grid
- Add model listing pages
- Implement tag system

### Phase 4: Admin Features
- Build admin dashboard with stats (exists at /admin but needs enhancement)
- ~~Create comparison management interface~~ ✅ Done in Phase 2
- ~~Add retry functionality for failed videos~~ ✅ Done in Phase 2
- Implement manual upload form (/admin/upload)
- Add job queue monitoring (/admin/jobs)
- Model management interface (/admin/models)
- Comparison edit/update functionality
- Bulk operations (delete, publish, feature)
- Advanced filtering and search

### Phase 5: Enhanced Features
- Implement anonymous voting system
- Add performance charts and visualizations
- Build search functionality
- Add more providers (Runway direct API)
- Implement real-time job status updates

### Phase 6: Polish
- Performance optimization
- SEO improvements
- Mobile responsiveness
- Error handling and logging
- Documentation

---

## Considerations for Future Phases

### Phase 3 - Public Interface
**Requirements**:
- GET /api/comparisons/[id] route for public comparison view
- Video grid component (can reuse from admin detail page)
- Public layout without auth requirement
- Filtering by type, tags, featured status
- Pagination for comparison lists

**Technical Notes**:
- Reuse VideoCard component from admin pages
- Consider server components for SEO (Next.js 15 app router)
- Public pages should not require authentication middleware

### Phase 4 - Remaining Admin Features
**Requirements**:
- Manual video upload form with metadata entry
- Job queue monitoring with real-time updates (consider WebSocket or polling)
- Model CRUD operations (add, edit, deactivate)
- Comparison edit functionality (update title, description, toggle public/featured)
- Bulk operations UI (select multiple comparisons, batch publish/delete)

**Technical Notes**:
- Manual upload needs different flow (no provider API call)
- Job monitoring could use BullMQ's built-in events
- Consider using Server-Sent Events (SSE) for real-time job updates
- Model management should validate provider compatibility

### Phase 5 - Enhanced Features
**Requirements**:
- Anonymous voting needs FingerprintJS integration
- Performance charts need data aggregation (avg generation time, success rate)
- Runway direct API implementation (different flow than fal.ai)
- Real-time status updates for processing videos

**Technical Notes**:
- Voting requires IP hash + fingerprint for duplicate prevention
- Charts could use Recharts or similar library
- Runway API uses polling pattern (different from fal.ai subscribe)
- Real-time updates: consider WebSocket, SSE, or polling strategy

### Phase 6 - Polish
**Requirements**:
- Error boundaries for graceful error handling
- Loading states and skeletons for better UX
- Mobile-responsive video grid (consider aspect ratios)
- Image optimization (Next.js Image component)
- Comprehensive error logging (consider Sentry or similar)

**Technical Notes**:
- Next.js 15 has built-in error.tsx support
- Video player mobile controls need testing
- R2 images should be served with appropriate caching headers
- Consider adding health check endpoints for monitoring

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| GET | `/api/comparisons` | List comparisons | Public | ✅ Phase 2 |
| POST | `/api/comparisons` | Create comparison | Admin | ✅ Phase 2 |
| GET | `/api/comparisons/[id]` | Get comparison | Public | 📋 Phase 3 |
| PATCH | `/api/comparisons/[id]` | Update comparison | Admin | 📋 Phase 4 |
| DELETE | `/api/comparisons/[id]` | Delete comparison | Admin | 📋 Phase 4 |
| GET | `/api/videos` | List videos | Public | 📋 Phase 3 |
| POST | `/api/videos/[id]/retry` | Retry failed video | Admin | ✅ Phase 2 |
| POST | `/api/videos/[id]/vote` | Vote for video | Public | 📋 Phase 5 |
| POST | `/api/upload/image` | Upload source image | Admin | ✅ Phase 2 |
| POST | `/api/upload/video` | Upload manual video | Admin | 📋 Phase 4 |
| GET | `/api/models` | List models | Public | 📋 Phase 3 |
| POST | `/api/models` | Create model | Admin | 📋 Phase 4 |
| GET | `/api/jobs` | List jobs | Admin | 📋 Phase 4 |

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
