import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  MANUAL_VIDEO_TYPES,
  checkManualVideoFile,
  manualUploadErrorResponse,
} from "@/lib/manual-video";
import { presignUpload } from "@/src/lib/storage/r2";

const schema = z.object({
  contentType: z.string(),
  size: z.number().int().positive(),
});

// POST /api/upload/video/presign - URL for uploading a video straight to R2 (admin only)
export async function POST(req: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { contentType, size } = schema.parse(await req.json());
    checkManualVideoFile(contentType, size);

    const key = `uploads/${randomUUID()}.${MANUAL_VIDEO_TYPES[contentType]}`;
    const uploadUrl = await presignUpload(key, contentType);

    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    const { body, status } = manualUploadErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
