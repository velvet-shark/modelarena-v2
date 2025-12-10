import { Worker, Job } from "bullmq";
import prisma from "@/lib/prisma";
import { getProvider } from "../providers/registry";
import { downloadAndUploadVideo } from "../storage/r2";
import { generateThumbnail } from "../thumbnails/generate";
import { getConnection, type GenerationJobData } from "./index";
import { CostCalculator, type PricingConfig } from "../pricing";

export function createWorker(concurrency = 5) {
  const worker = new Worker<GenerationJobData>(
    "video-generation",
    async (job: Job<GenerationJobData>) => {
      const {
        videoId,
        modelId,
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
        // Check if video still exists (may have been deleted)
        const existingVideo = await prisma.video.findUnique({
          where: { id: videoId },
          select: { id: true },
        });

        if (!existingVideo) {
          console.log(`[Worker] Video ${videoId} no longer exists, skipping job`);
          return { success: false, videoId, skipped: true };
        }

        // Update video status to processing
        await prisma.video.update({
          where: { id: videoId },
          data: { status: "PROCESSING" },
        });

        // Fetch model to get default params
        const model = await prisma.model.findUnique({
          where: { id: modelId },
          select: {
            defaultParams: true,
            costPerSecond: true,
          },
        });

        // Extract model-specific default params (i2v or t2v based on source)
        const modelParams = model?.defaultParams as Record<string, unknown> | null;
        const isImageToVideo = !!sourceImageUrl;
        const modeParams = isImageToVideo
          ? (modelParams?.i2v as Record<string, unknown> | undefined)
          : (modelParams?.t2v as Record<string, unknown> | undefined);

        // Extract top-level field mappings (imageUrlField, imageUrlIsArray, pricing, etc.)
        const fieldMappings: Record<string, unknown> = {};
        if (modelParams?.imageUrlField) fieldMappings.imageUrlField = modelParams.imageUrlField;
        if (modelParams?.imageUrlIsArray) fieldMappings.imageUrlIsArray = modelParams.imageUrlIsArray;
        if (modelParams?.pricing) fieldMappings.pricing = modelParams.pricing;

        // Build final params: model defaults < job params (job params win)
        // Include field mappings for provider to handle
        const finalAdditionalParams = {
          ...fieldMappings, // Field mapping config
          ...modeParams, // Model's default params (like elements for Kling O1)
          ...additionalParams, // Any explicit additional params
        };

        // Override aspect_ratio with comparison's setting if provided
        if (aspectRatio) {
          finalAdditionalParams.aspect_ratio = aspectRatio;
        }

        console.log(
          `[Worker] Using params for ${videoId}:`,
          JSON.stringify({
            duration,
            aspectRatio,
            seed,
            additionalParams: finalAdditionalParams,
          })
        );

        // Get provider and generate video
        const provider = getProvider(providerName);
        console.log(`[Worker] Using provider: ${provider.name}`);

        const result = await provider.generateVideo(modelEndpoint, {
          prompt,
          sourceImageUrl,
          duration,
          aspectRatio,
          seed,
          additionalParams: finalAdditionalParams,
        });

        if (result.success && result.videoUrl) {
          console.log(`[Worker] Video generated successfully, uploading to R2`);

          // Download video and upload to R2 (also extracts metadata via ffprobe)
          const r2Result = await downloadAndUploadVideo(
            result.videoUrl,
            videoId
          );

          // Use metadata from ffprobe (most reliable), then API response, then request params as fallback
          const videoDuration =
            r2Result.metadata?.duration ?? result.duration ?? duration ?? 0;
          const videoWidth =
            r2Result.metadata?.width ?? result.width ?? undefined;
          const videoHeight =
            r2Result.metadata?.height ?? result.height ?? undefined;

          console.log(
            `[Worker] Final video metrics: ${videoDuration}s, ${videoWidth}x${videoHeight}`
          );

          // Generate thumbnail
          console.log(`[Worker] Generating thumbnail`);
          const thumbnailResult = await generateThumbnail(
            r2Result.url,
            videoId
          );

          // Extract pricing config from defaultParams (model already fetched above)
          const pricingConfig = (model?.defaultParams as any)
            ?.pricing as PricingConfig | undefined;

          // Calculate cost based on actual video metrics
          const costResult = CostCalculator.calculate(
            pricingConfig,
            {
              duration: videoDuration,
              width: videoWidth,
              height: videoHeight,
              hasAudio: false, // Currently all videos have no audio
              additionalParams: finalAdditionalParams,
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
              duration: videoDuration,
              width: videoWidth,
              height: videoHeight,
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

        // Update video status to failed (if it still exists)
        try {
          await prisma.video.update({
            where: { id: videoId },
            data: {
              status: "FAILED",
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
          });
        } catch (updateError) {
          // Video may have been deleted, ignore update error
          console.log(`[Worker] Could not update video ${videoId} (may have been deleted)`);
        }

        throw error;
      }
    },
    {
      connection: getConnection(),
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
