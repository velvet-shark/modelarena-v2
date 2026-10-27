import type { VideoProvider } from "./types";
import { FalProvider } from "./fal";
import { RunwayProvider } from "./runway";
import { ManualProvider } from "./manual";

// Providers are created on first use, so a missing optional key (e.g.
// RUNWAY_API_KEY) only fails jobs for that provider instead of the whole worker.
const factories: Record<string, () => VideoProvider> = {
  "fal.ai": () => new FalProvider(),
  runway: () => new RunwayProvider(),
  manual: () => new ManualProvider(),
};

const instances = new Map<string, VideoProvider>();

export function getProvider(name: string): VideoProvider {
  const existing = instances.get(name);
  if (existing) return existing;

  const factory = factories[name];
  if (!factory) {
    throw new Error(`Unknown provider: ${name}`);
  }
  const provider = factory();
  instances.set(name, provider);
  return provider;
}
