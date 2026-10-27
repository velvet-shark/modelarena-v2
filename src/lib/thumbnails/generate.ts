import ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import { readFile } from "fs/promises";

// Grab a 480px-wide JPEG at 10% of the video from a local file
export async function extractThumbnail(videoPath: string, workDir: string): Promise<Buffer> {
  const filename = "thumb.jpg";

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timestamps: ["10%"],
        filename,
        folder: workDir,
        size: "480x?", // 480px width, maintain aspect ratio
      })
      .on("end", () => resolve())
      .on("error", reject);
  });

  return readFile(join(workDir, filename));
}
