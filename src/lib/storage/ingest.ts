import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  downloadFile,
  extractVideoMetadata,
  uploadThumbnail,
  uploadVideo,
  type VideoMetadata,
} from "./r2";
import { extractThumbnail } from "../thumbnails/generate";

export interface IngestedVideo {
  url: string;
  key: string;
  fileSize: number;
  metadata: VideoMetadata | null;
  // null when ffmpeg couldn't grab a frame; the video is still usable
  thumbnail: { url: string; key: string } | null;
}

// Download a generated video once, then probe, upload and thumbnail it from
// the same temp file
export async function ingestVideo(sourceUrl: string, videoId: string): Promise<IngestedVideo> {
  console.log(`[Ingest] Downloading video from ${sourceUrl}`);
  const buffer = await downloadFile(sourceUrl);

  const workDir = await mkdtemp(join(tmpdir(), `ingest-${videoId}-`));
  try {
    const videoPath = join(workDir, "video.mp4");
    await writeFile(videoPath, buffer);

    const metadata = await extractVideoMetadata(videoPath);
    if (metadata) {
      console.log(
        `[Ingest] Video metadata: ${metadata.duration}s, ${metadata.width}x${metadata.height}`
      );
    }

    const thumbnailBuffer = await extractThumbnail(videoPath, workDir).catch((error) => {
      console.error(`[Ingest] Thumbnail failed for ${videoId}, continuing without one:`, error);
      return null;
    });

    // Neither ffprobe nor ffmpeg could read it: an error page, not a video
    if (!metadata && !thumbnailBuffer) {
      throw new Error("Downloaded file is not a readable video");
    }

    console.log(`[Ingest] Uploading video to R2 (${buffer.length} bytes)`);
    const video = await uploadVideo(buffer, `${videoId}.mp4`);

    let thumbnail: IngestedVideo["thumbnail"] = null;
    if (thumbnailBuffer) {
      thumbnail = await uploadThumbnail(thumbnailBuffer, `${videoId}.jpg`).catch((error) => {
        console.error(`[Ingest] Thumbnail upload failed for ${videoId}:`, error);
        return null;
      });
    }

    return { ...video, fileSize: buffer.length, metadata, thumbnail };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
