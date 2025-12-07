import { PrismaClient } from "@prisma/client";
import type { PricingConfig } from "../src/lib/pricing/types";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create capabilities
  const imageToVideo = await prisma.capability.upsert({
    where: { name: "image-to-video" },
    update: {},
    create: { name: "image-to-video" },
  });

  const textToVideo = await prisma.capability.upsert({
    where: { name: "text-to-video" },
    update: {},
    create: { name: "text-to-video" },
  });

  // Create providers
  const falProvider = await prisma.provider.upsert({
    where: { name: "fal.ai" },
    update: {},
    create: {
      name: "fal.ai",
      displayName: "fal.ai",
      apiKeyEnv: "FAL_KEY",
    },
  });

  const runwayProvider = await prisma.provider.upsert({
    where: { name: "runway" },
    update: {},
    create: {
      name: "runway",
      displayName: "Runway",
      apiKeyEnv: "RUNWAY_API_KEY",
    },
  });

  const manualProvider = await prisma.provider.upsert({
    where: { name: "manual" },
    update: {},
    create: {
      name: "manual",
      displayName: "Manual Upload",
      apiKeyEnv: null,
    },
  });

  // Create models with brand and T2V endpoints
  const models = [
    // Kling
    {
      slug: "kling-2.5-turbo-standard",
      name: "Kling 2.5 Turbo Standard",
      brand: "Kling",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
      endpointT2V: "fal-ai/kling-video/v2.5-turbo/standard/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.21,
          baseDuration: 5,
          pricePerExtraSecond: 0.042,
        } as PricingConfig,
      },
    },
    {
      slug: "kling-2.5-turbo-pro",
      name: "Kling 2.5 Turbo Pro",
      brand: "Kling",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      endpointT2V: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.35,
          baseDuration: 5,
          pricePerExtraSecond: 0.07,
        } as PricingConfig,
      },
    },
    {
      slug: "kling-o1",
      name: "Kling AI O1",
      brand: "Kling",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/o1/image-to-video",
      endpointT2V: null, // O1 does not support T2V
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.112,
        } as PricingConfig,
      },
    },
    // Runway
    {
      slug: "runway-gen4-turbo",
      name: "Runway Gen-4 Turbo",
      brand: "Runway",
      provider: runwayProvider,
      endpoint: "gen4_turbo",
      endpointT2V: "gen4_turbo", // Same endpoint, different input
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.05,
        } as PricingConfig,
      },
    },
    // Veo
    {
      slug: "veo-3.1-reference",
      name: "Veo 3.1 Reference",
      brand: "Veo",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/reference-to-video",
      endpointT2V: null, // Reference-to-video only
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.15,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "veo-3.1-fast",
      name: "Veo 3.1 Fast",
      brand: "Veo",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/fast/image-to-video",
      endpointT2V: "fal-ai/veo3.1/fast",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: {
            withoutAudio: 0.1,
            withAudio: 0.15,
          },
        } as PricingConfig,
      },
    },
    {
      slug: "veo-3.1",
      name: "Veo 3.1",
      brand: "Veo",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/image-to-video",
      endpointT2V: "fal-ai/veo3.1",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: {
            withoutAudio: 0.2,
            withAudio: 0.4,
          },
          isEstimated: true,
        } as PricingConfig,
      },
    },
    // Sora
    {
      slug: "sora-2-pro",
      name: "Sora 2 Pro",
      brand: "Sora",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video/pro",
      endpointT2V: "fal-ai/sora-2/text-to-video/pro",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "resolution-dependent",
          pricingType: "per-second",
          tiers: [
            { maxWidth: 1280, maxHeight: 720, price: 0.3 },
            { maxWidth: 1920, maxHeight: 1080, price: 0.5 },
          ],
        } as PricingConfig,
      },
    },
    {
      slug: "sora-2",
      name: "Sora 2",
      brand: "Sora",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video",
      endpointT2V: "fal-ai/sora-2/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.1,
        } as PricingConfig,
      },
    },
    // Hailuo / MiniMax
    {
      slug: "hailuo-2.3-pro",
      name: "Hailuo 2.3 Pro",
      brand: "Hailuo",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
      endpointT2V: "fal-ai/minimax/hailuo-02/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.49,
        } as PricingConfig,
      },
    },
    {
      slug: "hailuo-2.3-standard",
      name: "Hailuo 2.3 Standard",
      brand: "Hailuo",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
      endpointT2V: "fal-ai/minimax/hailuo-02/standard/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.28,
        } as PricingConfig,
      },
    },
    {
      slug: "hailuo-2.3-fast-standard",
      name: "Hailuo 2.3 Fast Standard",
      brand: "Hailuo",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video",
      endpointT2V: null, // Fast variants may not have T2V
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.28,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "hailuo-2.3-fast-pro",
      name: "Hailuo 2.3 Fast Pro",
      brand: "Hailuo",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video",
      endpointT2V: null, // Fast variants may not have T2V
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.49,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    // Wan
    {
      slug: "wan-2.5-preview",
      name: "Wan 2.5 Preview",
      brand: "Wan",
      provider: falProvider,
      endpoint: "fal-ai/wan-25-preview/image-to-video",
      endpointT2V: "fal-ai/wan-25-preview/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "resolution-dependent",
          pricingType: "per-second",
          tiers: [
            { maxWidth: 854, maxHeight: 480, price: 0.05 },
            { maxWidth: 1280, maxHeight: 720, price: 0.1 },
            { maxWidth: 1920, maxHeight: 1080, price: 0.15 },
          ],
        } as PricingConfig,
      },
    },
    // Seedance
    {
      slug: "seedance-1.0-pro-fast",
      name: "Seedance 1.0 Pro Fast",
      brand: "Seedance",
      provider: falProvider,
      endpoint: "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
      endpointT2V: "fal-ai/bytedance/seedance/v1/pro/fast/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.08,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    // Vidu
    {
      slug: "vidu-q2-turbo",
      name: "Vidu Q2 Turbo",
      brand: "Vidu",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/turbo",
      endpointT2V: "fal-ai/vidu/q2/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.08,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "vidu-q2-pro",
      name: "Vidu Q2 Pro",
      brand: "Vidu",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/pro",
      endpointT2V: "fal-ai/vidu/q2/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.3,
          baseDuration: 0,
          pricePerExtraSecond: 0.1,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "vidu-q2-reference",
      name: "Vidu Q2 Reference",
      brand: "Vidu",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/reference-to-video",
      endpointT2V: null, // Reference-to-video only
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "per-second",
          pricePerSecond: 0.1,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    // Luma
    {
      slug: "luma-ray-2-flash",
      name: "Luma Ray 2 Flash",
      brand: "Luma",
      provider: falProvider,
      endpoint: "fal-ai/luma-dream-machine/ray-2-flash/image-to-video",
      endpointT2V: "fal-ai/luma-dream-machine/ray-2-flash",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.25,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "luma-ray-2",
      name: "Luma Ray 2",
      brand: "Luma",
      provider: falProvider,
      endpoint: "fal-ai/luma-dream-machine/ray-2/image-to-video",
      endpointT2V: "fal-ai/luma-dream-machine/ray-2",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.5,
        } as PricingConfig,
      },
    },
    {
      slug: "luma-ray-3",
      name: "Luma Ray 3",
      brand: "Luma",
      provider: manualProvider,
      endpoint: null,
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.5,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    // Pika
    {
      slug: "pika-2.2",
      name: "Pika 2.2",
      brand: "Pika",
      provider: falProvider,
      endpoint: "fal-ai/pika/v2.2/image-to-video",
      endpointT2V: "fal-ai/pika/v2.2/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        pricing: {
          model: "resolution-dependent",
          pricingType: "flat-rate",
          tiers: [
            { maxWidth: 1280, maxHeight: 720, price: 0.2 },
            { maxWidth: 1920, maxHeight: 1080, price: 0.45 },
          ],
        } as PricingConfig,
      },
    },
    {
      slug: "pika-2-turbo",
      name: "Pika 2 Turbo",
      brand: "Pika",
      provider: falProvider,
      endpoint: "fal-ai/pika/v2/turbo/image-to-video",
      endpointT2V: null, // Turbo may not have T2V
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.15,
          isEstimated: true,
        } as PricingConfig,
      },
    },
    {
      slug: "pika-2.5",
      name: "Pika 2.5",
      brand: "Pika",
      provider: manualProvider,
      endpoint: null,
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        pricing: {
          model: "flat-rate",
          price: 0.5,
          isEstimated: true,
        } as PricingConfig,
      },
    },
  ];

  for (const model of models) {
    await prisma.model.upsert({
      where: { slug: model.slug },
      update: {
        brand: model.brand,
        endpointT2V: model.endpointT2V,
        defaultParams: model.defaultParams as any,
        capabilities: {
          set: model.capabilities.map((c) => ({ id: c.id })),
        },
      },
      create: {
        slug: model.slug,
        name: model.name,
        brand: model.brand,
        providerId: model.provider.id,
        endpoint: model.endpoint,
        endpointT2V: model.endpointT2V,
        defaultParams: model.defaultParams as any,
        capabilities: {
          connect: model.capabilities.map((c) => ({ id: c.id })),
        },
      },
    });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
