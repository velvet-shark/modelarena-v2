import * as fal from "@fal-ai/serverless-client";
import type {
  VideoProvider,
  GenerationRequest,
  GenerationResult,
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
    request: GenerationRequest
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Extract special field mappings from additionalParams
      const {
        imageUrlField,
        imageUrlIsArray,
        pricing, // Remove pricing from API params
        ...cleanParams
      } = (request.additionalParams || {}) as Record<string, unknown>;

      // Build the input object
      const input: Record<string, unknown> = {
        prompt: request.prompt,
        ...cleanParams,
      };

      // Handle image URL field mapping
      if (request.sourceImageUrl) {
        if (imageUrlField && typeof imageUrlField === "string") {
          // Custom image field name (e.g., "image_urls" for Kling O1)
          if (imageUrlIsArray) {
            input[imageUrlField] = [request.sourceImageUrl];
          } else {
            input[imageUrlField] = request.sourceImageUrl;
          }
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

      console.log(
        `[fal.ai] Sending request to ${modelEndpoint}:`,
        JSON.stringify(input, null, 2)
      );

      const result = await fal.subscribe(modelEndpoint, {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          // Could emit progress events here
          console.log(`[fal.ai] Queue update:`, update.status);
        },
      });

      const generationTime = (Date.now() - startTime) / 1000;

      // Extract video URL from response (different models may have different structures)
      const videoUrl =
        (result as any).video?.url ||
        (result as any).video_url ||
        (result as any).output?.video_url;

      if (!videoUrl) {
        console.error("[fal.ai] No video URL in response:", result);
        return {
          success: false,
          generationTime,
          error: "No video URL in API response",
          rawResponse: result,
        };
      }

      return {
        success: true,
        videoUrl,
        duration: (result as any).video?.duration,
        width: (result as any).video?.width,
        height: (result as any).video?.height,
        generationTime,
        rawResponse: result,
        apiRequestId: (result as any).request_id,
      };
    } catch (error: unknown) {
      const generationTime = (Date.now() - startTime) / 1000;

      // Log validation error details if available
      const errObj = error as { body?: { detail?: unknown[] }; status?: number };
      if (errObj?.body?.detail) {
        console.error("[fal.ai] Validation error details:", JSON.stringify(errObj.body.detail, null, 2));
      } else {
        console.error("[fal.ai] Generation error:", error);
      }

      return {
        success: false,
        generationTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
