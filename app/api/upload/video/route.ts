import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadVideo, uploadThumbnail } from "@/lib/storage/r2";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const comparisonId = formData.get("comparisonId") as string;
    const modelId = formData.get("modelId") as string;
    const generationTime = formData.get("generationTime") as string | null;
    const cost = formData.get("cost") as string | null;
    const duration = formData.get("duration") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!videoFile || !comparisonId || !modelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate video file
    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video" },
        { status: 400 }
      );
    }

    // Max 500MB
    const maxSize = 500 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: "Video file too large (max 500MB)" },
        { status: 400 }
      );
    }

    // Check if video already exists for this comparison+model
    const existing = await prisma.video.findFirst({
      where: {
        comparisonId,
        modelId,
      },
    });

    if (existing && existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Video already exists for this model in this comparison" },
        { status: 409 }
      );
    }

    // Create or update video record
    const video = existing
      ? await prisma.video.update({
          where: { id: existing.id },
          data: {
            status: "PROCESSING",
            isManual: true,
            errorMessage: null,
          },
        })
      : await prisma.video.create({
          data: {
            comparisonId,
            modelId,
            status: "PROCESSING",
            isManual: true,
          },
        });

    // Save video to temp file
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempVideoPath = join(tmpdir(), `upload-${video.id}.mp4`);
    await writeFile(tempVideoPath, buffer);

    try {
      // Upload to R2
      const videoKey = `${video.id}.mp4`;
      const r2Result = await uploadVideo(buffer, videoKey);

      // Generate thumbnail from local file
      const tempThumbPath = join(tmpdir(), `thumb-${video.id}.jpg`);
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require("fluent-ffmpeg");
        ffmpeg(tempVideoPath)
          .screenshots({
            count: 1,
            timestamps: ["10%"],
            filename: `thumb-${video.id}.jpg`,
            folder: tmpdir(),
            size: "480x?",
          })
          .on("end", resolve)
          .on("error", reject);
      });

      const fs = await import("fs/promises");
      const thumbnailBuffer = await fs.readFile(tempThumbPath);
      const thumbnailKey = `${video.id}.jpg`;
      const thumbnailResult = await uploadThumbnail(thumbnailBuffer, thumbnailKey);

      // Cleanup thumbnail temp file
      await unlink(tempThumbPath).catch(() => {});

      // Get video metadata using ffprobe if available
      let width: number | null = null;
      let height: number | null = null;
      let videoDuration: number | null = duration ? parseFloat(duration) : null;

      try {
        const ffmpeg = require("fluent-ffmpeg");
        const metadata = await new Promise<any>((resolve, reject) => {
          ffmpeg.ffprobe(tempVideoPath, (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
        if (videoStream) {
          width = videoStream.width;
          height = videoStream.height;
          if (!videoDuration) {
            videoDuration = parseFloat(videoStream.duration || metadata.format.duration);
          }
        }
      } catch (error) {
        console.warn("Failed to get video metadata:", error);
      }

      // Update video record
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: "COMPLETED",
          url: r2Result.url,
          r2Key: r2Result.key,
          thumbnailUrl: thumbnailResult.url,
          thumbnailKey: thumbnailResult.key,
          fileSize: videoFile.size,
          width,
          height,
          duration: videoDuration,
          generationTime: generationTime ? parseFloat(generationTime) : null,
          cost: cost ? parseFloat(cost) : null,
          manualMetadata: notes ? { notes } : null,
        },
      });

      // Cleanup temp file
      await unlink(tempVideoPath);

      return NextResponse.json({ success: true, videoId: video.id });
    } catch (error) {
      // Cleanup temp file on error
      try {
        await unlink(tempVideoPath);
      } catch {}

      // Mark video as failed
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Upload failed",
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
