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

interface RunwayTaskResponse {
  id: string;
  status: "PENDING" | "THROTTLED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  output?: string[];
  failure?: string;
  failure_code?: string;
}

class RunwayHttpError extends Error {
  constructor(readonly status: number, body: string) {
    super(`Runway API error: ${status} - ${body}`);
  }
}

class RunwayInputError extends Error {}

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
    request: GenerationRequest,
    options: GenerateOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    let taskId = options.requestId;

    if (!taskId) {
      // Step 1: Create generation task
      try {
        taskId = await this.createTask(modelEndpoint, request);
      } catch (error) {
        const rejected =
          error instanceof RunwayInputError ||
          (error instanceof RunwayHttpError && !isRetryableStatus(error.status));
        // Network errors and 5xx/429 are thrown so the job retries
        if (!rejected) throw error;
        console.error("[runway] Request rejected:", error);
        return {
          success: false,
          generationTime: (Date.now() - startTime) / 1000,
          error: error.message,
        };
      }
      await options.onSubmitted?.(taskId);
    }

    // Step 2: Poll for completion
    const { task: result, runningAt } = await this.pollTask(taskId, startTime);

    // Counted from when Runway starts working, not from queueing
    const generationTime = (Date.now() - (runningAt ?? startTime)) / 1000;

    if (result.status === "SUCCEEDED" && result.output && result.output[0]) {
      return {
        success: true,
        videoUrl: result.output[0],
        generationTime,
        apiRequestId: taskId,
        rawResponse: result,
      };
    }

    return {
      success: false,
      generationTime,
      error: result.failure || `Generation ${result.status.toLowerCase()} with unknown error`,
      apiRequestId: taskId,
      rawResponse: result,
      // INTERNAL.* and THROTTLED failures are Runway-side; SAFETY.* and ASSET.* are not
      retryable: /^(INTERNAL|THROTTLED)/.test(result.failure_code ?? ""),
    };
  }

  private async createTask(
    modelEndpoint: string,
    request: GenerationRequest
  ): Promise<string> {
    // Runway API requires promptImage for image-to-video
    if (!request.sourceImageUrl) {
      throw new RunwayInputError("Runway image-to-video requires a source image");
    }

    // Extract special config fields from additionalParams before merging
    const {
      promptField,
      imageUrlField,
      imageUrlFormat,
      aspectRatioField,
      aspectRatioFormat,
      pricing,
      ...cleanParams
    } = (request.additionalParams || {}) as Record<string, unknown>;

    // Map aspect ratio to Runway's pixel-based ratio format
    // Valid values: 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672
    const ratioMap: Record<string, string> = {
      "16:9": "1280:720",
      "9:16": "720:1280",
      "1:1": "960:960",
    };
    const ratio = request.aspectRatio ? ratioMap[request.aspectRatio] || "1280:720" : "1280:720";

    const payload: Record<string, unknown> = {
      model: modelEndpoint,
      promptImage: request.sourceImageUrl,
      promptText: request.prompt,
      duration: request.duration || 5,
      ...cleanParams, // Apply additional params first
      ratio, // Override ratio with the correctly mapped value
    };

    if (request.seed) {
      payload.seed = request.seed;
    }

    console.log("[runway] Sending payload:", JSON.stringify(payload, null, 2));

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
      throw new RunwayHttpError(response.status, await response.text());
    }

    const data = await response.json();
    return data.id;
  }

  private async pollTask(
    taskId: string,
    startTime: number
  ): Promise<{ task: RunwayTaskResponse; runningAt: number | null }> {
    let runningAt: number | null = null;
    while (Date.now() - startTime < MAX_WAIT_MS) {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Runway-Version": "2024-11-06",
        },
      });

      if (!response.ok) {
        throw new RunwayHttpError(response.status, await response.text());
      }

      const data: RunwayTaskResponse = await response.json();

      if (data.status === "RUNNING" && runningAt === null) {
        runningAt = Date.now();
      }
      if (data.status === "SUCCEEDED" || data.status === "FAILED" || data.status === "CANCELLED") {
        return { task: data, runningAt };
      }

      await sleep(POLL_INTERVAL_MS);
    }

    // Thrown, so the retry resumes this task instead of starting a new one
    throw new Error(`Runway task ${taskId} still running after 30 minutes`);
  }
}
