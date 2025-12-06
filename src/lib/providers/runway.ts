import type {
  VideoProvider,
  GenerationRequest,
  GenerationResult,
} from "./types";

export class RunwayProvider implements VideoProvider {
  name = "runway";

  async generateVideo(
    modelEndpoint: string,
    request: GenerationRequest
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement Runway API integration
      // Runway uses a two-step process:
      // 1. POST to create generation task
      // 2. Poll GET endpoint for status/result

      throw new Error("Runway provider not yet implemented");
    } catch (error) {
      const generationTime = (Date.now() - startTime) / 1000;
      console.error("[runway] Generation error:", error);

      return {
        success: false,
        generationTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
