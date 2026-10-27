import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";

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

// Best effort: a leftover object only costs storage, so log instead of failing
export async function deleteFiles(keys: Array<string | null | undefined>): Promise<void> {
  await Promise.all(
    keys
      .filter((key): key is string => !!key)
      .map((key) =>
        deleteFile(key).catch((err) => console.error(`[R2] Failed to delete ${key}:`, err))
      )
  );
}

// Download a file from URL and return as buffer
export async function downloadFile(url: string, timeoutMs = 5 * 60 * 1000): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
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

// Extract video metadata from a local file using ffprobe
export function extractVideoMetadata(path: string): Promise<VideoMetadata | null> {
  return new Promise<VideoMetadata | null>((resolve) => {
    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) {
        console.error(`[R2] ffprobe error:`, err);
        resolve(null);
        return;
      }

      const videoStream = metadata.streams?.find((s) => s.codec_type === "video");

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
        console.warn(`[R2] Incomplete metadata:`, { duration, width, height });
        resolve(null);
      }
    });
  });
}
