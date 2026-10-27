import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadImage } from "@/src/lib/storage/r2";
import sharp from "sharp";

// Maximum dimensions for uploaded images (fal.ai limit is 4000x4000)
const MAX_DIMENSION = 3840; // 4K resolution, safely under the limit

// POST /api/upload/image - Upload source image for comparisons
export async function POST(request: NextRequest) {
  try {
    const { error: denied } = await requireAdmin();
    if (denied) return denied;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());

    // Always re-encode: applies EXIF orientation, strips metadata (GPS, camera
    // serials) from the public file, and guarantees the bytes match image/jpeg.
    let buffer: Buffer;
    let width: number;
    let height: number;
    try {
      const { data, info } = await sharp(input)
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      buffer = data;
      width = info.width;
      height = info.height;
    } catch {
      return NextResponse.json(
        { error: "File is not a valid image." },
        { status: 400 }
      );
    }

    const filename = `${crypto.randomUUID()}.jpeg`;

    // Upload to R2
    const { url, key } = await uploadImage(buffer, filename);

    // Create source image record
    const sourceImage = await prisma.sourceImage.create({
      data: {
        filename: file.name,
        r2Key: key,
        url,
        width,
        height,
      },
    });

    return NextResponse.json(sourceImage, { status: 201 });
  } catch (error) {
    console.error("[API] Error uploading image:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
