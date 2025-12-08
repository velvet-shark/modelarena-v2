import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadImage } from "@/src/lib/storage/r2";
import sharp from "sharp";

// Maximum dimensions for uploaded images (fal.ai limit is 4000x4000)
const MAX_DIMENSION = 3840; // 4K resolution, safely under the limit

// POST /api/upload/image - Upload source image for comparisons
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    // Process image with sharp: resize if needed and get dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let width = metadata.width;
    let height = metadata.height;

    // Resize if either dimension exceeds the max
    if (width && height && (width > MAX_DIMENSION || height > MAX_DIMENSION)) {
      console.log(`[API] Resizing image from ${width}x${height} to fit within ${MAX_DIMENSION}px`);

      buffer = await image
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Get new dimensions
      const resizedMetadata = await sharp(buffer).metadata();
      width = resizedMetadata.width;
      height = resizedMetadata.height;

      console.log(`[API] Resized image to ${width}x${height}`);
    }

    // Generate unique filename (always save as jpeg after processing)
    const timestamp = Date.now();
    const filename = `${timestamp}.jpeg`;

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
