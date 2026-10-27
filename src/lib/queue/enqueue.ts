import { getGenerationQueue, type GenerationJobData } from "./index";

// Shared by create comparison, add models and retry so every path sends the
// same endpoint and generation parameters.

export interface JobComparison {
  id: string;
  type: string;
  prompt: string;
  duration: number | null;
  aspectRatio: string | null;
  seed: number | null;
  sourceImage: { url: string } | null;
}

export interface JobModel {
  id: string;
  name: string;
  endpoint: string | null;
  endpointT2V: string | null;
  provider: { name: string };
}

export function endpointFor(model: JobModel, type: string): string | null {
  return type === "image-to-video" ? model.endpoint : model.endpointT2V;
}

/** Models that can't run this comparison type; callers reject the request. */
export function modelsMissingEndpoint(models: JobModel[], type: string): string[] {
  return models.filter((m) => !endpointFor(m, type)).map((m) => m.name);
}

export function buildGenerationJob(
  videoId: string,
  comparison: JobComparison,
  model: JobModel,
  additionalParams?: Record<string, unknown>
): GenerationJobData {
  const endpoint = endpointFor(model, comparison.type);
  if (!endpoint) {
    throw new Error(`Model ${model.name} has no endpoint for ${comparison.type}`);
  }
  return {
    videoId,
    comparisonId: comparison.id,
    modelId: model.id,
    prompt: comparison.prompt,
    sourceImageUrl:
      comparison.type === "image-to-video" ? comparison.sourceImage?.url : undefined,
    modelEndpoint: endpoint,
    providerName: model.provider.name,
    duration: comparison.duration ?? undefined,
    aspectRatio: comparison.aspectRatio ?? undefined,
    seed: comparison.seed ?? undefined,
    additionalParams,
  };
}

/**
 * Call only after the video rows are committed: the worker may pick a job up
 * within milliseconds and skips jobs whose video it can't find.
 */
export async function enqueueGenerations(jobs: GenerationJobData[]): Promise<void> {
  if (jobs.length === 0) return;
  await getGenerationQueue().addBulk(jobs.map((data) => ({ name: "generate", data })));
}
