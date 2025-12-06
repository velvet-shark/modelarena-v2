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
}

export interface VideoProvider {
  name: string;
  generateVideo(
    modelEndpoint: string,
    request: GenerationRequest
  ): Promise<GenerationResult>;
  checkStatus?(requestId: string): Promise<GenerationResult>;
  estimateCost?(request: GenerationRequest): number;
}
