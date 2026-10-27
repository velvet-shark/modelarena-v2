// Provider abstraction for AI video generation services

export interface GenerationRequest {
  prompt: string;
  sourceImageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  seed?: number;
  additionalParams?: Record<string, unknown>;
}

export interface GenerationResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  cost?: number;
  generationTime: number;
  apiRequestId?: string;
  rawResponse?: unknown;
  error?: string;
  // Failed, but a fresh submission may succeed (provider 5xx, rate limit)
  retryable?: boolean;
}

export interface GenerateOptions {
  // Resume waiting on a request submitted by an earlier attempt instead of
  // paying for a new one
  requestId?: string;
  // Called once the provider accepted the request, before waiting on it
  onSubmitted?: (requestId: string) => Promise<void>;
}

// Contract: errors thrown while waiting on a submitted request are transient
// (the caller retries and resumes the same request). A returned failure is
// final for that request; `retryable` says whether resubmitting is worth it.
export interface VideoProvider {
  name: string;
  generateVideo(
    modelEndpoint: string,
    request: GenerationRequest,
    options?: GenerateOptions
  ): Promise<GenerationResult>;
  estimateCost?(request: GenerationRequest): number;
}

// 4xx other than timeout/rate limit means the input itself was rejected
export function isRetryableStatus(status: number | undefined): boolean {
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

export const POLL_INTERVAL_MS = 5000;
// Per attempt; a timed-out attempt resumes the same request on retry
export const MAX_WAIT_MS = 30 * 60 * 1000;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
