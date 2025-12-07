import type {
  VideoProvider,
  GenerationRequest,
  GenerationResult,
} from "./types";

interface RunwayTaskResponse {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  output?: string[];
  failure?: string;
  failure_code?: string;
}

export class RunwayProvider implements VideoProvider {
  name = "runway";
  private apiKey: string;
  private baseUrl = "https://api.dev.runwayml.com/v1";

  constructor() {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("RUNWAY_API_KEY environment variable not set");
    }
    this.apiKey = apiKey;
  }

  async generateVideo(
    modelEndpoint: string,
    request: GenerationRequest
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Create generation task
      const taskId = await this.createTask(modelEndpoint, request);

      // Step 2: Poll for completion
      const result = await this.pollTask(taskId);

      const generationTime = (Date.now() - startTime) / 1000;

      if (result.status === "SUCCEEDED" && result.output && result.output[0]) {
        return {
          success: true,
          videoUrl: result.output[0],
          generationTime,
          apiRequestId: taskId,
          rawResponse: result,
        };
      } else {
        return {
          success: false,
          generationTime,
          error: result.failure || "Generation failed with unknown error",
        };
      }
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

  private async createTask(
    modelEndpoint: string,
    request: GenerationRequest
  ): Promise<string> {
    const payload: any = {
      model: modelEndpoint,
      prompt_text: request.prompt,
    };

    // Add image if provided (for image-to-video)
    if (request.sourceImageUrl) {
      payload.prompt_image = request.sourceImageUrl;
    }

    // Add optional parameters
    if (request.duration) {
      payload.duration = request.duration;
    }

    // Map aspect ratio to Runway's pixel-based ratio format
    if (request.aspectRatio) {
      const ratioMap: Record<string, string> = {
        "16:9": "1280:720",
        "9:16": "720:1280",
        "1:1": "960:960",
      };
      const mappedRatio = ratioMap[request.aspectRatio];
      if (mappedRatio) {
        payload.ratio = mappedRatio;
      }
    }

    if (request.seed) {
      payload.seed = request.seed;
    }

    // Merge additional params
    if (request.additionalParams) {
      Object.assign(payload, request.additionalParams);
    }

    const response = await fetch(`${this.baseUrl}/image_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async pollTask(
    taskId: string,
    maxAttempts = 120,
    pollInterval = 5000
  ): Promise<RunwayTaskResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Runway-Version": "2024-11-06",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${response.status} - ${error}`);
      }

      const data: RunwayTaskResponse = await response.json();

      if (data.status === "SUCCEEDED" || data.status === "FAILED") {
        return data;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Runway generation timeout after 10 minutes");
  }
}
