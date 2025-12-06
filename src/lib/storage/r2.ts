import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

// Download and upload to R2 in one step
export async function downloadAndUploadVideo(
  sourceUrl: string,
  videoId: string
): Promise<{ url: string; key: string; fileSize: number }> {
  console.log(`[R2] Downloading video from ${sourceUrl}`);
  const buffer = await downloadFile(sourceUrl);

  console.log(`[R2] Uploading video to R2 (${buffer.length} bytes)`);
  const result = await uploadVideo(buffer, `${videoId}.mp4`);

  return {
    ...result,
    fileSize: buffer.length,
  };
}
