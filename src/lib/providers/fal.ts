import { fal, ApiError } from "@fal-ai/client";
import {
  isRetryableStatus,
  sleep,
  MAX_WAIT_MS,
  POLL_INTERVAL_MS,
  type VideoProvider,
  type GenerationRequest,
  type GenerationResult,
  type GenerateOptions,
} from "./types";

// Configure fal.ai client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

export class FalProvider implements VideoProvider {
  name = "fal.ai";

  async generateVideo(
    modelEndpoint: string,
    request: GenerationRequest,
    options: GenerateOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const elapsed = () => (Date.now() - startTime) / 1000;
    let requestId = options.requestId;

    if (requestId) {
      console.log(`[fal.ai] Resuming request ${requestId} on ${modelEndpoint}`);
    } else {
      const input = this.buildInput(request);
      console.log(
        `[fal.ai] Sending request to ${modelEndpoint}:`,
        JSON.stringify(input, null, 2)
      );

      try {
        const submitted = await fal.queue.submit(modelEndpoint, { input });
        requestId = submitted.request_id;
      } catch (error) {
        if (error instanceof ApiError && !isRetryableStatus(error.status)) {
          return this.failure(error, elapsed());
        }
        throw error;
      }
      await options.onSubmitted?.(requestId);
    }

    // Generation time counts from when the model starts working, so time spent
    // waiting in fal's queue doesn't make a model look slow
    let inProgressAt: number | null = null;
    let inferenceTime: number | null = null;
    for (;;) {
      if (Date.now() - startTime > MAX_WAIT_MS) {
        throw new Error(`fal.ai request ${requestId} still running after 30 minutes`);
      }
      const status = await fal.queue.status(modelEndpoint, { requestId });
      if (status.status === "IN_PROGRESS" && inProgressAt === null) {
        inProgressAt = Date.now();
      }
      if (status.status === "COMPLETED") {
        inferenceTime = status.metrics?.inference_time ?? null;
        break;
      }
      await sleep(POLL_INTERVAL_MS);
    }

    const generationTime =
      inferenceTime && inferenceTime > 0
        ? inferenceTime
        : (Date.now() - (inProgressAt ?? startTime)) / 1000;

    let result: unknown;
    try {
      ({ data: result } = await fal.queue.result(modelEndpoint, { requestId }));
    } catch (error) {
      // The request finished but failed on fal's side
      if (error instanceof ApiError) return this.failure(error, generationTime);
      throw error;
    }

    // Extract video URL from response (different models may have different structures)
    const output = result as {
      video?: { url?: string; duration?: number; width?: number; height?: number };
      video_url?: string;
      output?: { video_url?: string };
    };
    const videoUrl = output.video?.url || output.video_url || output.output?.video_url;

    if (!videoUrl) {
      console.error("[fal.ai] No video URL in response:", result);
      return {
        success: false,
        generationTime,
        error: "No video URL in API response",
        rawResponse: result,
        apiRequestId: requestId,
      };
    }

    return {
      success: true,
      videoUrl,
      duration: output.video?.duration,
      width: output.video?.width,
      height: output.video?.height,
      generationTime,
      rawResponse: result,
      apiRequestId: requestId,
    };
  }

  private buildInput(request: GenerationRequest): Record<string, unknown> {
    // Extract special field mappings from additionalParams
    const {
      imageUrlField,
      imageUrlIsArray,
      pricing: _pricing, // Remove pricing from API params
      ...cleanParams
    } = (request.additionalParams || {}) as Record<string, unknown>;

    const input: Record<string, unknown> = {
      prompt: request.prompt,
      ...cleanParams,
    };

    // Handle image URL field mapping
    if (request.sourceImageUrl) {
      if (imageUrlField && typeof imageUrlField === "string") {
        // Custom image field name (e.g., "image_urls" for Kling O1)
        input[imageUrlField] = imageUrlIsArray ? [request.sourceImageUrl] : request.sourceImageUrl;
      } else {
        // Default: use image_url
        input.image_url = request.sourceImageUrl;
      }
    }

    // Set aspect_ratio if provided and not already set
    if (request.aspectRatio && !input.aspect_ratio) {
      input.aspect_ratio = request.aspectRatio;
    }

    // Set duration if provided and not already set
    if (request.duration !== undefined && input.duration === undefined) {
      input.duration = request.duration;
    }

    // Set seed if provided
    if (request.seed !== undefined) {
      input.seed = request.seed;
    }

    return input;
  }

  private failure(error: ApiError<unknown>, generationTime: number): GenerationResult {
    // Extract detailed error message from fal.ai response
    const body = error.body as { detail?: Array<{ msg?: string; type?: string }> | string } | undefined;
    let errorMessage: string;

    if (Array.isArray(body?.detail) && body.detail.length > 0) {
      const detail = body.detail[0];
      errorMessage = `${detail.type || "error"}: ${detail.msg || "Unknown error"}`;
      console.error("[fal.ai] Validation error details:", JSON.stringify(body.detail, null, 2));
    } else {
      errorMessage = typeof body?.detail === "string" ? body.detail : error.message;
      console.error("[fal.ai] Generation error:", error);
    }

    return {
      success: false,
      generationTime,
      error: errorMessage,
      rawResponse: error.body,
      apiRequestId: error.requestId || undefined,
      retryable: isRetryableStatus(error.status),
    };
  }
}
