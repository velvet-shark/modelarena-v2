import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadVideo(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `videos/${key}`,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  return {
    key: `videos/${key}`,
    url: `${PUBLIC_URL}/videos/${key}`,
  };
}

export async function uploadImage(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `images/${key}`,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return {
    key: `images/${key}`,
    url: `${PUBLIC_URL}/images/${key}`,
  };
}

export async function uploadThumbnail(
  buffer: Buffer,
  key: string
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `thumbnails/${key}`,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return {
    key: `thumbnails/${key}`,
    url: `${PUBLIC_URL}/thumbnails/${key}`,
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
