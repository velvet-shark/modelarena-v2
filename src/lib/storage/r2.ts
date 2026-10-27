import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import ffmpeg from "fluent-ffmpeg";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import type { Readable } from "stream";

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

// Each key is written once for its video/image row (a re-upload gets a new
// row id, a source image a new uuid), so CDN and browsers can keep it forever
const IMMUTABLE = "public, max-age=31536000, immutable";

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
      CacheControl: IMMUTABLE,
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
      CacheControl: IMMUTABLE,
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
      CacheControl: IMMUTABLE,
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

// Streams from disk, so large manual uploads never sit in memory
export async function uploadFile(
  path: string,
  key: string,
  contentType: string,
  size: number
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(path),
      ContentLength: size,
      ContentType: contentType,
      CacheControl: IMMUTABLE,
    })
  );
  return { key, url: `${PUBLIC_URL}/${key}` };
}

// Lets the browser PUT a file straight to R2 (needs a CORS rule on the bucket)
export function presignUpload(key: string, contentType: string, expiresIn = 15 * 60) {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function headObject(
  key: string
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

export async function downloadObjectToFile(key: string, path: string): Promise<void> {
  const object = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await pipeline(object.Body as Readable, createWriteStream(path));
}

export async function copyObject(
  from: string,
  to: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${from}`,
      Key: to,
      ContentType: contentType,
      CacheControl: IMMUTABLE,
      MetadataDirective: "REPLACE",
    })
  );
  return { key: to, url: `${PUBLIC_URL}/${to}` };
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
