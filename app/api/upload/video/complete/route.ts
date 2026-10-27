import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicData } from "@/lib/data/public";
import {
  STAGING_KEY,
  ManualUploadError,
  checkManualVideoFile,
  claimManualVideo,
  failManualVideo,
  finishManualVideo,
  manualUploadErrorResponse,
  manualVideoFieldsSchema,
} from "@/lib/manual-video";
import { deleteFiles, downloadObjectToFile, headObject } from "@/src/lib/storage/r2";

const schema = manualVideoFieldsSchema.extend({
  key: z.string().regex(STAGING_KEY),
});

// POST /api/upload/video/complete - Process a video the browser uploaded to R2 (admin only)
export async function POST(req: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  let videoId: string | null = null;
  let workDir: string | null = null;
  let stagingKey: string | null = null;

  try {
    const { key, ...fields } = schema.parse(await req.json());
    stagingKey = key;

    // Trust what R2 stored, not what the client claims
    const object = await headObject(key);
    if (!object) {
      throw new ManualUploadError("Uploaded file not found", 400);
    }
    checkManualVideoFile(object.contentType, object.size);

    videoId = await claimManualVideo(fields.comparisonId, fields.modelId);

    workDir = await mkdtemp(join(tmpdir(), `upload-${videoId}-`));
    const path = join(workDir, "video");
    await downloadObjectToFile(key, path);

    await finishManualVideo(
      videoId,
      { path, workDir, contentType: object.contentType!, size: object.size, stagingKey: key },
      fields
    );

    revalidatePublicData();
    return NextResponse.json({ success: true, videoId });
  } catch (error) {
    if (videoId) await failManualVideo(videoId, error);
    const { body, status } = manualUploadErrorResponse(error);
    return NextResponse.json(body, { status });
  } finally {
    // Copied to its final key on success; useless on failure
    if (stagingKey) await deleteFiles([stagingKey]);
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
