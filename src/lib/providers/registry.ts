import type { VideoProvider } from "./types";
import { FalProvider } from "./fal";
import { RunwayProvider } from "./runway";
import { ManualProvider } from "./manual";

// Registry of all available providers
const providers: Map<string, VideoProvider> = new Map([
  ["fal.ai", new FalProvider()],
  ["runway", new RunwayProvider()],
  ["manual", new ManualProvider()],
]);

export function getProvider(name: string): VideoProvider {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

export function getAllProviders(): VideoProvider[] {
  return Array.from(providers.values());
}

export function getProviderNames(): string[] {
  return Array.from(providers.keys());
}
