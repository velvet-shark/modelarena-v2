import { createWriteStream } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  ManualUploadError,
  checkManualVideoFile,
  claimManualVideo,
  failManualVideo,
  finishManualVideo,
  manualUploadErrorResponse,
  manualVideoFieldsSchema,
} from "@/lib/manual-video";

// POST /api/upload/video - Multipart upload through the app (admin only).
// Fallback for when the browser can't PUT to R2 directly (no CORS rule yet).
export async function POST(req: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  let videoId: string | null = null;
  let workDir: string | null = null;

  try {
    const formData = await req.formData();
    const videoFile = formData.get("video");
    if (!(videoFile instanceof File)) {
      throw new ManualUploadError("Missing required fields", 400);
    }
    checkManualVideoFile(videoFile.type, videoFile.size);

    const fields = manualVideoFieldsSchema.parse({
      comparisonId: formData.get("comparisonId"),
      modelId: formData.get("modelId"),
      generationTime: formData.get("generationTime"),
      cost: formData.get("cost"),
      duration: formData.get("duration"),
      notes: formData.get("notes"),
    });

    videoId = await claimManualVideo(fields.comparisonId, fields.modelId);

    workDir = await mkdtemp(join(tmpdir(), `upload-${videoId}-`));
    const path = join(workDir, "video");
    await pipeline(
      Readable.fromWeb(videoFile.stream() as WebReadableStream),
      createWriteStream(path)
    );

    await finishManualVideo(
      videoId,
      { path, workDir, contentType: videoFile.type, size: videoFile.size },
      fields
    );

    return NextResponse.json({ success: true, videoId });
  } catch (error) {
    if (videoId) await failManualVideo(videoId, error);
    const { body, status } = manualUploadErrorResponse(error);
    return NextResponse.json(body, { status });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
