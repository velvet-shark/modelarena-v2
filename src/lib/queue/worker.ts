import { Worker, Job, UnrecoverableError } from "bullmq";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getProvider } from "../providers/registry";
import type { GenerationRequest, VideoProvider } from "../providers/types";
import { ingestVideo } from "../storage/ingest";
import { deleteFiles } from "../storage/r2";
import { getConnection, type GenerationJobData, type GeneratedOutput } from "./index";
import { CostCalculator, type PricingConfig } from "../pricing";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toJson(value: unknown) {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

// Run the provider, or resume the request an earlier attempt submitted.
// Progress is saved in the job data, so a retry after a download or upload
// failure reuses the paid result instead of generating again.
async function generate(
  job: Job<GenerationJobData>,
  provider: VideoProvider,
  request: GenerationRequest
): Promise<GeneratedOutput> {
  const { videoId, modelEndpoint } = job.data;

  const result = await provider.generateVideo(modelEndpoint, request, {
    requestId: job.data.providerRequestId,
    onSubmitted: async (requestId) => {
      await job.updateData({ ...job.data, providerRequestId: requestId });
      await prisma.video.updateMany({ where: { id: videoId }, data: { apiRequestId: requestId } });
    },
  });

  if (!result.success || !result.videoUrl) {
    const message = result.error || "Video generation failed";
    console.error(`[Worker] Video generation failed:`, message);
    await prisma.video.updateMany({
      where: { id: videoId },
      data: { generationTime: result.generationTime, apiResponse: toJson(result.rawResponse) },
    });

    // Rejected input fails the same way every time; don't burn attempts on it
    if (!result.retryable) throw new UnrecoverableError(message);
    // The next attempt submits a fresh request
    await job.updateData({ ...job.data, providerRequestId: undefined });
    throw new Error(message);
  }

  const generated: GeneratedOutput = {
    videoUrl: result.videoUrl,
    duration: result.duration,
    width: result.width,
    height: result.height,
    generationTime: result.generationTime,
    apiRequestId: result.apiRequestId,
  };
  await job.updateData({ ...job.data, generated });
  // Record the paid result right away, so it isn't lost if storing it fails
  await prisma.video.updateMany({
    where: { id: videoId },
    data: {
      generationTime: generated.generationTime,
      apiRequestId: generated.apiRequestId,
      apiResponse: toJson(result.rawResponse),
    },
  });
  return generated;
}

export async function processGenerationJob(job: Job<GenerationJobData>) {
  const {
    videoId,
    modelId,
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
    // Skip videos that were deleted, cancelled or already completed
    // (e.g. a manual upload landed while this job waited)
    const { count: claimed } = await prisma.video.updateMany({
      where: { id: videoId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      data: { status: "PROCESSING" },
    });

    if (claimed === 0) {
      console.log(`[Worker] Video ${videoId} is gone or finished, skipping job`);
      return { success: false, videoId, skipped: true };
    }

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

    let generated = job.data.generated;
    if (generated) {
      console.log(`[Worker] Reusing video generated by an earlier attempt`);
    } else {
      let provider: VideoProvider;
      try {
        provider = getProvider(providerName);
      } catch (error) {
        // Unknown provider or missing API key: retrying won't help
        throw new UnrecoverableError(errorMessage(error));
      }
      console.log(`[Worker] Using provider: ${provider.name}`);

      generated = await generate(job, provider, {
        prompt,
        sourceImageUrl,
        duration,
        aspectRatio,
        seed,
        additionalParams: finalAdditionalParams,
      });
    }

    console.log(`[Worker] Video generated successfully, uploading to R2`);
    const media = await ingestVideo(generated.videoUrl, videoId);

    // Use metadata from ffprobe (most reliable), then API response, then request params as fallback
    const videoDuration = media.metadata?.duration ?? generated.duration ?? duration ?? 0;
    const videoWidth = media.metadata?.width ?? generated.width ?? undefined;
    const videoHeight = media.metadata?.height ?? generated.height ?? undefined;

    console.log(
      `[Worker] Final video metrics: ${videoDuration}s, ${videoWidth}x${videoHeight}`
    );

    // Extract pricing config from defaultParams (model already fetched above)
    const pricingConfig = modelParams?.pricing as PricingConfig | undefined;

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
      console.log(`[Worker] Cost breakdown for ${videoId}:`, costResult.breakdown);
    }
    if (costResult.error) {
      console.warn(`[Worker] Cost calculation warning for ${videoId}:`, costResult.error);
    }

    // Update video record with all the data
    const { count } = await prisma.video.updateMany({
      where: { id: videoId },
      data: {
        status: "COMPLETED",
        errorMessage: null,
        url: media.url,
        r2Key: media.key,
        thumbnailUrl: media.thumbnail?.url ?? null,
        thumbnailKey: media.thumbnail?.key ?? null,
        duration: videoDuration,
        width: videoWidth,
        height: videoHeight,
        fileSize: media.fileSize,
        generationTime: generated.generationTime,
        cost: costResult.cost,
        apiRequestId: generated.apiRequestId,
      },
    });

    if (count === 0) {
      // Deleted while we worked: remove what we just uploaded
      console.log(`[Worker] Video ${videoId} was deleted during processing, cleaning up`);
      await deleteFiles([media.key, media.thumbnail?.key]);
      return { success: false, videoId, skipped: true };
    }

    console.log(`[Worker] Video ${videoId} completed successfully`);
    return { success: true, videoId };
  } catch (error) {
    const message = errorMessage(error);
    const attempts = job.opts.attempts ?? 1;
    const attempt = job.attemptsMade + 1;
    const willRetry = !(error instanceof UnrecoverableError) && attempt < attempts;
    console.error(`[Worker] Attempt ${attempt}/${attempts} failed for video ${videoId}:`, error);

    // Stay QUEUED while BullMQ retries, so the admin retry button can't
    // start a second job for the same video
    await prisma.video
      .updateMany({
        where: { id: videoId },
        data: willRetry
          ? {
              status: "QUEUED",
              errorMessage: `Attempt ${attempt} of ${attempts} failed, retrying: ${message}`,
            }
          : { status: "FAILED", errorMessage: message },
      })
      .catch((updateError) =>
        console.error(`[Worker] Could not update video ${videoId}:`, updateError)
      );

    throw error;
  }
}

export function createWorker(concurrency = 5) {
  const worker = new Worker<GenerationJobData>("video-generation", processGenerationJob, {
    connection: getConnection(),
    concurrency,
  });

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
