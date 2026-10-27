import { execFile } from "child_process";
import { mkdtemp, rm, stat, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { claimManualVideo, failManualVideo, finishManualVideo } from "@/lib/manual-video";
import { downloadFile } from "@/src/lib/storage/r2";

// Imports finished clips made outside ModelArena (for example in the
// Higgsfield web app) into one comparison, without the admin upload form.
//
//   DATABASE_URL=... pnpm tsx scripts/import-videos.ts manifest.json [--dry-run]
//
// The manifest names the comparison (created hidden if the slug is new) and
// one clip per model: a URL or a local file, plus optional credits, attempt
// count and a note. Models that already have a completed video in the
// comparison are skipped, so a rerun only adds what is missing. Needs the R2
// variables from .env, ffmpeg and ffprobe.

const exec = promisify(execFile);

const manifestSchema = z.object({
  comparison: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["text-to-video", "image-to-video"]),
    prompt: z.string().min(1),
    aspectRatio: z.string().optional(),
    duration: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
  }),
  videos: z
    .array(
      z.object({
        model: z.string(),
        source: z.string(),
        credits: z.number().nonnegative().optional(),
        attempts: z.number().int().positive().optional(),
        generationTime: z.number().nonnegative().optional(),
        note: z.string().optional(),
        jobId: z.string().optional(),
      })
    )
    .min(1),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function videoCodec(path: string) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", path,
  ]);
  return stdout.trim();
}

// Browsers need H.264 to play every clip, and faststart lets eight of them
// begin playing before they finish downloading
async function prepareForWeb(input: string, workDir: string) {
  const output = join(workDir, "web.mp4");
  const codec = await videoCodec(input);
  const video = codec === "h264" ? ["-c:v", "copy"] : ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p"];
  await exec("ffmpeg", ["-y", "-v", "error", "-i", input, ...video, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output]);
  return { path: output, transcoded: codec !== "h264", codec };
}

async function main() {
  const [manifestPath, ...flags] = process.argv.slice(2);
  if (!manifestPath) throw new Error("Usage: tsx scripts/import-videos.ts manifest.json [--dry-run]");
  const dryRun = flags.includes("--dry-run");
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));

  const models = await prisma.model.findMany({
    where: { slug: { in: manifest.videos.map((v) => v.model) } },
    select: { id: true, slug: true },
  });
  const modelIds = new Map(models.map((m) => [m.slug, m.id]));
  const unknown = manifest.videos.filter((v) => !modelIds.has(v.model)).map((v) => v.model);
  if (unknown.length) throw new Error(`Unknown model slugs: ${unknown.join(", ")}`);

  const { comparison: c } = manifest;
  let comparison = await prisma.comparison.findUnique({ where: { slug: c.slug }, select: { id: true, isPublic: true } });
  if (!comparison && !dryRun) {
    comparison = await prisma.comparison.create({
      data: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        type: c.type,
        prompt: c.prompt,
        aspectRatio: c.aspectRatio,
        duration: c.duration,
        isPublic: false,
        tags: {
          connectOrCreate: c.tags.map((name) => ({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) } })),
        },
      },
      select: { id: true, isPublic: true },
    });
    console.log(`Created hidden comparison /comparisons/${c.slug}`);
  } else {
    console.log(comparison ? `Using comparison /comparisons/${c.slug}` : `Would create comparison /comparisons/${c.slug}`);
  }

  const done = comparison
    ? new Set(
        (
          await prisma.video.findMany({
            where: { comparisonId: comparison.id, status: "COMPLETED" },
            select: { model: { select: { slug: true } } },
          })
        ).map((v) => v.model.slug)
      )
    : new Set<string>();

  let imported = 0;
  for (const entry of manifest.videos) {
    if (done.has(entry.model)) {
      console.log(`skip ${entry.model}: already has a completed video`);
      continue;
    }
    if (dryRun || !comparison) {
      console.log(`would import ${entry.model} from ${entry.source.startsWith("http") ? new URL(entry.source).host : entry.source}`);
      continue;
    }

    const workDir = await mkdtemp(join(tmpdir(), "import-video-"));
    const videoId = await claimManualVideo(comparison.id, modelIds.get(entry.model)!);
    try {
      let original = entry.source;
      if (entry.source.startsWith("http")) {
        original = join(workDir, "original.mp4");
        await writeFile(original, await downloadFile(entry.source));
      }
      const web = await prepareForWeb(original, workDir);
      const { size } = await stat(web.path);

      await finishManualVideo(
        videoId,
        { path: web.path, workDir, contentType: "video/mp4", size },
        { comparisonId: comparison.id, modelId: modelIds.get(entry.model)!, generationTime: entry.generationTime }
      );
      await prisma.video.update({
        where: { id: videoId },
        data: {
          manualMetadata: {
            source: "higgsfield",
            credits: entry.credits ?? null,
            attempts: entry.attempts ?? 1,
            note: entry.note ?? null,
            jobId: entry.jobId ?? null,
          },
        },
      });
      imported++;
      console.log(`ok   ${entry.model} (${(size / 1e6).toFixed(1)} MB${web.transcoded ? `, transcoded from ${web.codec}` : ""})`);
    } catch (error) {
      await failManualVideo(videoId, error);
      console.error(`FAIL ${entry.model}:`, error instanceof Error ? error.message : error);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  console.log(
    `${imported} imported. The page is ${comparison?.isPublic ? "public" : "hidden until published in /admin/comparisons"}; public pages refresh within a minute.`
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
