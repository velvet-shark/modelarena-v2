import { Worker, Job } from "bullmq";
import prisma from "@/lib/prisma";
import { getProvider } from "../providers/registry";
import { downloadAndUploadVideo } from "../storage/r2";
import { generateThumbnail } from "../thumbnails/generate";
import { connection, type GenerationJobData } from "./index";
import { CostCalculator, type PricingConfig } from "../pricing";

export function createWorker(concurrency = 5) {
  const worker = new Worker<GenerationJobData>(
    "video-generation",
    async (job: Job<GenerationJobData>) => {
      const {
        videoId,
        modelEndpoint,
        providerName,
        prompt,
        sourceImageUrl,
        duration,
        aspectRatio,
        seed,
        additionalParams,
      } = job.data;

      console.log(`[Worker] Processing video generation for ${videoId}`);

      try {
        // Update video status to processing
        await prisma.video.update({
          where: { id: videoId },
          data: { status: "PROCESSING" },
        });

        // Get provider and generate video
        const provider = getProvider(providerName);
        console.log(`[Worker] Using provider: ${provider.name}`);

        const result = await provider.generateVideo(modelEndpoint, {
          prompt,
          sourceImageUrl,
          duration,
          aspectRatio,
          seed,
          additionalParams,
        });

        if (result.success && result.videoUrl) {
          console.log(`[Worker] Video generated successfully, uploading to R2`);

          // Download video and upload to R2
          const r2Result = await downloadAndUploadVideo(
            result.videoUrl,
            videoId
          );

          // Generate thumbnail
          console.log(`[Worker] Generating thumbnail`);
          const thumbnailResult = await generateThumbnail(
            r2Result.url,
            videoId
          );

          // Fetch model to get pricing config
          const model = await prisma.model.findUnique({
            where: { id: job.data.modelId },
            select: {
              costPerSecond: true,
              defaultParams: true,
            },
          });

          // Extract pricing config from defaultParams
          const pricingConfig = (model?.defaultParams as any)
            ?.pricing as PricingConfig | undefined;

          // Calculate cost based on actual video metrics
          const costResult = CostCalculator.calculate(
            pricingConfig,
            {
              duration: result.duration || 0,
              width: result.width,
              height: result.height,
              hasAudio: false, // Currently all videos have no audio
              additionalParams: additionalParams,
            },
            model?.costPerSecond
          );

          // Log cost breakdown for monitoring
          if (costResult.breakdown) {
            console.log(
              `[Worker] Cost breakdown for ${videoId}:`,
              costResult.breakdown
            );
          }
          if (costResult.error) {
            console.warn(
              `[Worker] Cost calculation warning for ${videoId}:`,
              costResult.error
            );
          }

          // Update video record with all the data
          await prisma.video.update({
            where: { id: videoId },
            data: {
              status: "COMPLETED",
              url: r2Result.url,
              r2Key: r2Result.key,
              thumbnailUrl: thumbnailResult.url,
              thumbnailKey: thumbnailResult.key,
              duration: result.duration,
              width: result.width,
              height: result.height,
              fileSize: r2Result.fileSize,
              generationTime: result.generationTime,
              cost: costResult.cost,
              apiRequestId: result.apiRequestId,
              apiResponse: result.rawResponse as any,
            },
          });

          console.log(`[Worker] Video ${videoId} completed successfully`);
          return { success: true, videoId };
        } else {
          // Generation failed
          console.error(
            `[Worker] Video generation failed:`,
            result.error
          );

          await prisma.video.update({
            where: { id: videoId },
            data: {
              status: "FAILED",
              errorMessage: result.error,
              generationTime: result.generationTime,
              apiResponse: result.rawResponse as any,
            },
          });

          throw new Error(result.error || "Video generation failed");
        }
      } catch (error) {
        console.error(`[Worker] Job failed for video ${videoId}:`, error);

        // Update video status to failed
        await prisma.video.update({
          where: { id: videoId },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        });

        throw error;
      }
    },
    {
      connection,
      concurrency,
    }
  );

  // Event handlers
  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err);
  });

  return worker;
}
