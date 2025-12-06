import type {
  VideoProvider,
  GenerationRequest,
  GenerationResult,
} from "./types";

export class ManualProvider implements VideoProvider {
  name = "manual";

  async generateVideo(
    _modelEndpoint: string,
    _request: GenerationRequest
  ): Promise<GenerationResult> {
    // Manual provider doesn't support automatic generation
    // Videos must be uploaded manually via the admin upload interface

    return {
      success: false,
      generationTime: 0,
      error: "Manual provider does not support automatic generation. Please use the manual upload interface.",
    };
  }
}
