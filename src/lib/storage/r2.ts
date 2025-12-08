import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function uploadVideo(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  const fullKey = `videos/${key}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  return {
    key: fullKey,
    url: `${PUBLIC_URL}/${fullKey}`,
  };
}

export async function uploadImage(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  const fullKey = `images/${key}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return {
    key: fullKey,
    url: `${PUBLIC_URL}/${fullKey}`,
  };
}

export async function uploadThumbnail(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  const fullKey = `thumbnails/${key}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return {
    key: fullKey,
    url: `${PUBLIC_URL}/${fullKey}`,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

// Download a file from URL and return as buffer
export async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Video metadata type
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

// Extract video metadata using ffprobe
export async function extractVideoMetadata(
  buffer: Buffer,
  videoId: string
): Promise<VideoMetadata | null> {
  const tempPath = join(tmpdir(), `probe-${videoId}.mp4`);

  try {
    await writeFile(tempPath, buffer);

    return await new Promise<VideoMetadata | null>((resolve) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          console.error(`[R2] ffprobe error:`, err);
          resolve(null);
          return;
        }

        const videoStream = metadata.streams?.find(
          (s) => s.codec_type === "video"
        );

        if (!videoStream) {
          console.warn(`[R2] No video stream found in metadata`);
          resolve(null);
          return;
        }

        const duration = metadata.format?.duration
          ? parseFloat(String(metadata.format.duration))
          : null;
        const width = videoStream.width;
        const height = videoStream.height;

        if (duration && width && height) {
          resolve({ duration, width, height });
        } else {
          console.warn(`[R2] Incomplete metadata:`, {
            duration,
            width,
            height,
          });
          resolve(null);
        }
      });
    });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

// Download and upload to R2 in one step, with metadata extraction
export async function downloadAndUploadVideo(
  sourceUrl: string,
  videoId: string
): Promise<{
  url: string;
  key: string;
  fileSize: number;
  metadata: VideoMetadata | null;
}> {
  console.log(`[R2] Downloading video from ${sourceUrl}`);
  const buffer = await downloadFile(sourceUrl);

  console.log(`[R2] Extracting video metadata`);
  const metadata = await extractVideoMetadata(buffer, videoId);
  if (metadata) {
    console.log(
      `[R2] Video metadata: ${metadata.duration}s, ${metadata.width}x${metadata.height}`
    );
  }

  console.log(`[R2] Uploading video to R2 (${buffer.length} bytes)`);
  const result = await uploadVideo(buffer, `${videoId}.mp4`);

  return {
    ...result,
    fileSize: buffer.length,
    metadata,
  };
}
