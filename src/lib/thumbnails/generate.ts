import ffmpeg from "fluent-ffmpeg";
import { uploadThumbnail, downloadFile } from "../storage/r2";
import { tmpdir } from "os";
import { join } from "path";
import { unlink, writeFile } from "fs/promises";

export async function generateThumbnail(
  videoUrl: string,
  videoId: string
): Promise<{ url: string; key: string }> {
  const tempVideoPath = join(tmpdir(), `video-${videoId}.mp4`);
  const tempThumbPath = join(tmpdir(), `thumb-${videoId}.jpg`);

  try {
    // Download video to temp file
    console.log(`[Thumbnail] Downloading video for thumbnail generation`);
    const videoBuffer = await downloadFile(videoUrl);
    await writeFile(tempVideoPath, videoBuffer);

    // Generate thumbnail using FFmpeg
    console.log(`[Thumbnail] Generating thumbnail for video ${videoId}`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          count: 1,
          timestamps: ["10%"], // Take screenshot at 10% of video
          filename: `thumb-${videoId}.jpg`,
          folder: tmpdir(),
          size: "480x?", // 480px width, maintain aspect ratio
        })
        .on("end", () => {
          console.log(`[Thumbnail] Thumbnail generated successfully`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`[Thumbnail] Error generating thumbnail:`, err);
          reject(err);
        });
    });

    // Read the generated thumbnail
    const fs = await import("fs/promises");
    const thumbnailBuffer = await fs.readFile(tempThumbPath);

    // Upload to R2
    console.log(`[Thumbnail] Uploading thumbnail to R2`);
    const result = await uploadThumbnail(thumbnailBuffer, `${videoId}.jpg`);

    // Cleanup temp files
    await unlink(tempVideoPath).catch(() => {});
    await unlink(tempThumbPath).catch(() => {});

    return result;
  } catch (error) {
    // Cleanup temp files on error
    await unlink(tempVideoPath).catch(() => {});
    await unlink(tempThumbPath).catch(() => {});
    throw error;
  }
}
