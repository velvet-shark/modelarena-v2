import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  copyObject,
  extractVideoMetadata,
  uploadFile,
  uploadThumbnail,
} from "@/src/lib/storage/r2";
import { extractThumbnail } from "@/src/lib/thumbnails/generate";

// Formats browsers can play; the key's extension follows the type
export const MANUAL_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const MAX_MANUAL_VIDEO_BYTES = 500 * 1024 * 1024;

// Direct uploads land here first; a lifecycle rule can clear abandoned ones
export const STAGING_KEY = /^uploads\/[0-9a-f-]{36}\.(mp4|mov|webm)$/;

// Form fields arrive as strings ("" when left empty)
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().pipe(schema).optional());

export const manualVideoFieldsSchema = z.object({
  comparisonId: z.string().min(1),
  modelId: z.string().min(1),
  generationTime: optionalNumber(z.number().nonnegative()),
  cost: optionalNumber(z.number().nonnegative()),
  duration: optionalNumber(z.number().positive()),
  notes: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().max(5000).optional()),
});

export type ManualVideoFields = z.infer<typeof manualVideoFieldsSchema>;

export class ManualUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function checkManualVideoFile(contentType: string | undefined, size: number) {
  if (!contentType || !MANUAL_VIDEO_TYPES[contentType]) {
    throw new ManualUploadError("Unsupported format: use MP4, MOV or WebM", 400);
  }
  if (size > MAX_MANUAL_VIDEO_BYTES) {
    throw new ManualUploadError("Video file too large (max 500MB)", 400);
  }
}

// Reserve the row for this comparison and model. A failed or queued
// generation gets replaced; a completed video does not.
export async function claimManualVideo(comparisonId: string, modelId: string): Promise<string> {
  const [comparison, model, existing] = await Promise.all([
    prisma.comparison.findUnique({ where: { id: comparisonId }, select: { id: true } }),
    prisma.model.findUnique({ where: { id: modelId }, select: { id: true } }),
    prisma.video.findMany({
      where: { comparisonId, modelId },
      select: { id: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!comparison || !model) {
    throw new ManualUploadError("Comparison or model not found", 404);
  }
  if (existing.some((v) => v.status === "COMPLETED")) {
    throw new ManualUploadError("Video already exists for this model in this comparison", 409);
  }

  if (existing[0]) {
    await prisma.video.update({
      where: { id: existing[0].id },
      data: { status: "PROCESSING", isManual: true, errorMessage: null },
    });
    return existing[0].id;
  }

  const video = await prisma.video.create({
    data: { comparisonId, modelId, status: "PROCESSING", isManual: true },
    select: { id: true },
  });
  return video.id;
}

// Probe and thumbnail a local copy, store the video under its final key and
// mark the row COMPLETED. `stagingKey` means the file is already in R2.
export async function finishManualVideo(
  videoId: string,
  file: { path: string; workDir: string; contentType: string; size: number; stagingKey?: string },
  fields: ManualVideoFields
) {
  const metadata = await extractVideoMetadata(file.path);
  const thumbnailBuffer = await extractThumbnail(file.path, file.workDir).catch((error) => {
    console.warn(`[Upload] Thumbnail failed for ${videoId}:`, error);
    return null;
  });

  if (!metadata && !thumbnailBuffer) {
    throw new ManualUploadError("File is not a readable video", 400);
  }

  const key = `videos/${videoId}.${MANUAL_VIDEO_TYPES[file.contentType]}`;
  const stored = file.stagingKey
    ? await copyObject(file.stagingKey, key, file.contentType)
    : await uploadFile(file.path, key, file.contentType, file.size);

  const thumbnail = thumbnailBuffer
    ? await uploadThumbnail(thumbnailBuffer, `${videoId}.jpg`).catch((error) => {
        console.warn(`[Upload] Thumbnail upload failed for ${videoId}:`, error);
        return null;
      })
    : null;

  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: "COMPLETED",
      url: stored.url,
      r2Key: stored.key,
      thumbnailUrl: thumbnail?.url ?? null,
      thumbnailKey: thumbnail?.key ?? null,
      fileSize: file.size,
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      duration: fields.duration ?? metadata?.duration ?? null,
      generationTime: fields.generationTime ?? null,
      cost: fields.cost ?? null,
      manualMetadata: fields.notes ? { notes: fields.notes } : undefined,
    },
  });
}

export async function failManualVideo(videoId: string, error: unknown) {
  await prisma.video
    .updateMany({
      where: { id: videoId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      },
    })
    .catch((updateError) => console.error(`[Upload] Could not mark ${videoId} failed:`, updateError));
}

export function manualUploadErrorResponse(error: unknown) {
  if (error instanceof ManualUploadError) {
    return { body: { error: error.message }, status: error.status };
  }
  if (error instanceof z.ZodError) {
    return { body: { error: "Invalid input", details: error.errors }, status: 400 };
  }
  console.error("Video upload error:", error);
  return { body: { error: "Upload failed" }, status: 500 };
}
