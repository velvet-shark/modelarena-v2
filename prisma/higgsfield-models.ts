// Models run by hand in the Higgsfield web app (no API). Their clips come in
// through scripts/import-videos.ts. Shared by seed.ts and add-higgsfield.ts.
export const HIGGSFIELD_MODELS = [
  { slug: "klingai-kling-4.0", name: "KlingAI Kling 4.0", brand: "KlingAI" },
  { slug: "bytedance-seedance-2.5", name: "ByteDance Seedance 2.5", brand: "ByteDance" },
  { slug: "bytedance-seedance-2.0", name: "ByteDance Seedance 2.0", brand: "ByteDance" },
  { slug: "minimax-h3", name: "MiniMax H3", brand: "MiniMax" },
  { slug: "alibaba-wan-3.0", name: "Alibaba Wan 3.0", brand: "Alibaba" },
  { slug: "xai-grok-imagine-1.5", name: "xAI Grok Imagine 1.5", brand: "xAI" },
  { slug: "black-forest-labs-flux.3-video", name: "Black Forest Labs FLUX.3 Video", brand: "Black Forest Labs" },
  { slug: "google-gemini-omni-flash-1.1", name: "Google Gemini Omni Flash 1.1", brand: "Google" },
];

export const HIGGSFIELD_PROVIDER = {
  name: "higgsfield",
  displayName: "Higgsfield",
  apiKeyEnv: null,
};
