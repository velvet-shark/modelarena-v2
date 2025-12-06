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
      const result = await fal.subscribe(modelEndpoint, {
        input: {
          prompt: request.prompt,
          image_url: request.sourceImageUrl,
          duration: request.duration,
          aspect_ratio: request.aspectRatio,
          seed: request.seed,
          ...request.additionalParams,
        },
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
    } catch (error) {
      const generationTime = (Date.now() - startTime) / 1000;
      console.error("[fal.ai] Generation error:", error);

      return {
        success: false,
        generationTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
