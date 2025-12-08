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

  // Define all models with EXACT parameters from specs
  // Variables: prompt, image_url (or similar), aspect_ratio are handled dynamically
  const models = [
    // ==================== IMAGE-TO-VIDEO MODELS ====================

    // KlingAI Kling 2.6 Pro (I2V + T2V)
    {
      slug: "klingai-kling-2.6-pro",
      name: "KlingAI Kling 2.6 Pro",
      brand: "KlingAI",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.6/pro/image-to-video",
      endpointT2V: "fal-ai/kling-video/v2.6/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          duration: "5",
          negative_prompt: "blur, distort, and low quality",
          generate_audio: false,
        },
        t2v: {
          duration: "5",
          aspect_ratio: "16:9",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5,
          generate_audio: false,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.07,
        } as PricingConfig,
      },
    },

    // KlingAI Kling 2.5 Turbo Pro (I2V + T2V)
    {
      slug: "klingai-kling-2.5-turbo-pro",
      name: "KlingAI Kling 2.5 Turbo Pro",
      brand: "KlingAI",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      endpointT2V: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          duration: "5",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5,
        },
        t2v: {
          duration: "5",
          aspect_ratio: "16:9",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5,
        },
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.35,
          baseDuration: 5,
          pricePerExtraSecond: 0.07,
        } as PricingConfig,
      },
    },

    // KlingAI Kling O1 (I2V only) - uses image_urls array, not image_url
    {
      slug: "klingai-kling-o1",
      name: "KlingAI Kling O1",
      brand: "KlingAI",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/o1/reference-to-video",
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        i2v: {
          duration: "5",
          // aspect_ratio comes from comparison settings
        },
        // Special: uses image_urls array instead of image_url
        imageUrlField: "image_urls",
        imageUrlIsArray: true,
        pricing: {
          model: "per-second",
          pricePerSecond: 0.112,
        } as PricingConfig,
      },
    },

    // Runway Gen-4 Turbo (I2V only)
    {
      slug: "runway-gen-4-turbo",
      name: "Runway Gen-4 Turbo",
      brand: "Runway",
      provider: runwayProvider,
      endpoint: "gen4_turbo",
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        i2v: {
          model: "gen4_turbo",
          duration: 5,
          // ratio is set dynamically based on comparison's aspectRatio
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.05,
        } as PricingConfig,
      },
    },

    // Google Veo 3.1 Fast (I2V + T2V)
    {
      slug: "google-veo-3.1-fast",
      name: "Google Veo 3.1 Fast",
      brand: "Google",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/fast/image-to-video",
      endpointT2V: "fal-ai/veo3.1/fast",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          aspect_ratio: "auto",
          duration: "6s",
          generate_audio: false,
          resolution: "1080p",
        },
        t2v: {
          aspect_ratio: "16:9",
          duration: "6s",
          enhance_prompt: true,
          auto_fix: true,
          resolution: "1080p",
          generate_audio: false,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.1,
        } as PricingConfig,
      },
    },

    // Google Veo 3.1 (I2V + T2V)
    {
      slug: "google-veo-3.1",
      name: "Google Veo 3.1",
      brand: "Google",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/image-to-video",
      endpointT2V: "fal-ai/veo3.1",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          aspect_ratio: "auto",
          duration: "6s",
          generate_audio: false,
          resolution: "1080p",
        },
        t2v: {
          aspect_ratio: "16:9",
          duration: "6s",
          enhance_prompt: true,
          auto_fix: true,
          resolution: "1080p",
          generate_audio: false,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.2,
        } as PricingConfig,
      },
    },

    // Google Veo 3 (T2V only)
    {
      slug: "google-veo-3",
      name: "Google Veo 3",
      brand: "Google",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/veo3",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          aspect_ratio: "16:9",
          duration: "6s",
          enhance_prompt: true,
          auto_fix: true,
          resolution: "1080p",
          generate_audio: false,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.2,
        } as PricingConfig,
      },
    },

    // OpenAI Sora 2 Pro (I2V + T2V)
    {
      slug: "openai-sora-2-pro",
      name: "OpenAI Sora 2 Pro",
      brand: "OpenAI",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video/pro",
      endpointT2V: "fal-ai/sora-2/text-to-video/pro",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          resolution: "auto",
          aspect_ratio: "auto",
          duration: 4,
          delete_video: true,
        },
        t2v: {
          resolution: "1080p",
          aspect_ratio: "16:9",
          duration: 4,
          delete_video: true,
        },
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

    // OpenAI Sora 2 (I2V + T2V)
    {
      slug: "openai-sora-2",
      name: "OpenAI Sora 2",
      brand: "OpenAI",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video",
      endpointT2V: "fal-ai/sora-2/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          resolution: "auto",
          aspect_ratio: "auto",
          duration: 4,
          delete_video: true,
        },
        t2v: {
          resolution: "720p",
          aspect_ratio: "16:9",
          duration: 4,
          delete_video: true,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.1,
        } as PricingConfig,
      },
    },

    // MiniMax Hailuo 02 Pro (I2V + T2V)
    {
      slug: "minimax-hailuo-02-pro",
      name: "MiniMax Hailuo 02 Pro",
      brand: "MiniMax",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-02/pro/image-to-video",
      endpointT2V: "fal-ai/minimax/hailuo-02/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          prompt_optimizer: true,
        },
        t2v: {
          prompt_optimizer: true,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.08,
        } as PricingConfig,
      },
    },

    // MiniMax Hailuo 02 Standard (T2V only)
    {
      slug: "minimax-hailuo-02-standard",
      name: "MiniMax Hailuo 02 Standard",
      brand: "MiniMax",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/minimax/hailuo-02/standard/text-to-video",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          duration: "6",
          prompt_optimizer: true,
        },
        pricing: {
          model: "per-second",
          pricePerSecond: 0.045,
        } as PricingConfig,
      },
    },

    // MiniMax Hailuo 2.3 Pro (I2V + T2V)
    {
      slug: "minimax-hailuo-2.3-pro",
      name: "MiniMax Hailuo 2.3 Pro",
      brand: "MiniMax",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
      endpointT2V: "fal-ai/minimax/hailuo-2.3/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          prompt_optimizer: true,
        },
        t2v: {
          prompt_optimizer: true,
        },
        pricing: {
          model: "flat-rate",
          price: 0.49,
        } as PricingConfig,
      },
    },

    // MiniMax Hailuo 2.3 Standard (T2V only)
    {
      slug: "minimax-hailuo-2.3-standard",
      name: "MiniMax Hailuo 2.3 Standard",
      brand: "MiniMax",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/minimax/hailuo-2.3/standard/text-to-video",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          prompt_optimizer: true,
          duration: "6",
        },
        pricing: {
          model: "flat-rate",
          price: 0.28,
        } as PricingConfig,
      },
    },

    // MiniMax Hailuo 2.3 Fast Pro (I2V only)
    {
      slug: "minimax-hailuo-2.3-fast-pro",
      name: "MiniMax Hailuo 2.3 Fast Pro",
      brand: "MiniMax",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video",
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        i2v: {
          prompt_optimizer: true,
        },
        pricing: {
          model: "flat-rate",
          price: 0.33,
        } as PricingConfig,
      },
    },

    // Alibaba Wan 2.5 (I2V + T2V)
    {
      slug: "alibaba-wan-2.5",
      name: "Alibaba Wan 2.5",
      brand: "Alibaba",
      provider: falProvider,
      endpoint: "fal-ai/wan-25-preview/image-to-video",
      endpointT2V: "fal-ai/wan-25-preview/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          resolution: "1080p",
          duration: "5",
          negative_prompt:
            "low resolution, error, worst quality, low quality, defects",
          enable_prompt_expansion: true,
          enable_safety_checker: true,
        },
        t2v: {
          aspect_ratio: "16:9",
          resolution: "1080p",
          duration: "5",
          negative_prompt:
            "low resolution, error, worst quality, low quality, defects",
          enable_prompt_expansion: true,
          enable_safety_checker: true,
        },
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

    // ByteDance Seedance 1.0 Pro (I2V + T2V)
    {
      slug: "bytedance-seedance-1.0-pro",
      name: "ByteDance Seedance 1.0 Pro",
      brand: "ByteDance",
      provider: falProvider,
      endpoint: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
      endpointT2V: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          aspect_ratio: "auto",
          resolution: "1080p",
          duration: "5",
          enable_safety_checker: true,
        },
        t2v: {
          aspect_ratio: "16:9",
          resolution: "1080p",
          duration: "5",
          enable_safety_checker: true,
        },
        pricing: {
          model: "flat-rate",
          price: 0.62,
        } as PricingConfig,
      },
    },

    // ByteDance Seedance 1.0 Pro Fast (T2V only)
    {
      slug: "bytedance-seedance-1.0-pro-fast",
      name: "ByteDance Seedance 1.0 Pro Fast",
      brand: "ByteDance",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/bytedance/seedance/v1/pro/fast/text-to-video",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          aspect_ratio: "16:9",
          resolution: "1080p",
          duration: "5",
          enable_safety_checker: true,
        },
        pricing: {
          model: "flat-rate",
          price: 0.245,
        } as PricingConfig,
      },
    },

    // Vidu Q2 Turbo (I2V only)
    {
      slug: "vidu-q2-turbo",
      name: "Vidu Q2 Turbo",
      brand: "Vidu",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/turbo",
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        i2v: {
          duration: 5,
          resolution: "1080p",
          movement_amplitude: "auto",
        },
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.2,
          baseDuration: 0,
          pricePerExtraSecond: 0.05,
        } as PricingConfig,
      },
    },

    // Vidu Q2 Pro (I2V only)
    {
      slug: "vidu-q2-pro",
      name: "Vidu Q2 Pro",
      brand: "Vidu",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/pro",
      endpointT2V: null,
      capabilities: [imageToVideo],
      defaultParams: {
        i2v: {
          duration: 5,
          resolution: "1080p",
          movement_amplitude: "auto",
        },
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.3,
          baseDuration: 0,
          pricePerExtraSecond: 0.1,
        } as PricingConfig,
      },
    },

    // Vidu Q2 (T2V only)
    {
      slug: "vidu-q2",
      name: "Vidu Q2",
      brand: "Vidu",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/vidu/q2/text-to-video",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          duration: 5,
          resolution: "1080p",
          aspect_ratio: "16:9",
          movement_amplitude: "auto",
        },
        pricing: {
          model: "base-plus-per-second",
          basePrice: 0.2,
          baseDuration: 0,
          pricePerExtraSecond: 0.1,
        } as PricingConfig,
      },
    },

    // PixVerse V5.5 (I2V + T2V)
    {
      slug: "pixverse-v5.5",
      name: "PixVerse V5.5",
      brand: "PixVerse",
      provider: falProvider,
      endpoint: "fal-ai/pixverse/v5.5/image-to-video",
      endpointT2V: "fal-ai/pixverse/v5.5/text-to-video",
      capabilities: [imageToVideo, textToVideo],
      defaultParams: {
        i2v: {
          aspect_ratio: "16:9",
          resolution: "1080p",
          duration: "5",
          negative_prompt:
            "blurry, low quality, low resolution, pixelated, noisy, grainy, out of focus, poorly lit, poorly exposed, poorly composed, poorly framed, poorly cropped, poorly color corrected, poorly color graded",
          thinking_type: "auto",
          generate_audio_switch: false,
        },
        t2v: {
          aspect_ratio: "16:9",
          resolution: "720p",
          duration: "5",
          negative_prompt:
            "blurry, low quality, low resolution, pixelated, noisy, grainy, out of focus, poorly lit, poorly exposed, poorly composed, poorly framed, poorly cropped, poorly color corrected, poorly color graded",
          thinking_type: "auto",
        },
        pricing: {
          model: "resolution-dependent",
          pricingType: "flat-rate",
          tiers: [
            { maxWidth: 640, maxHeight: 360, price: 0.15 },
            { maxWidth: 960, maxHeight: 540, price: 0.15 },
            { maxWidth: 1280, maxHeight: 720, price: 0.2 },
            { maxWidth: 1920, maxHeight: 1080, price: 0.4 },
          ],
        } as PricingConfig,
      },
    },

    // Pika 2.2 (T2V only)
    {
      slug: "pika-art-pika-2.2",
      name: "Pika Art Pika 2.2",
      brand: "Pika Art",
      provider: falProvider,
      endpoint: null,
      endpointT2V: "fal-ai/pika/v2.2/text-to-video",
      capabilities: [textToVideo],
      defaultParams: {
        t2v: {
          negative_prompt: "ugly, bad, terrible",
          aspect_ratio: "16:9",
          resolution: "1080p",
          duration: 5,
        },
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

    // Pika 2.5 (Manual - I2V)
    {
      slug: "pika-art-pika-2.5",
      name: "Pika Art Pika 2.5",
      brand: "Pika Art",
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

    // Luma Labs Ray 3 (Manual - I2V)
    {
      slug: "luma-labs-ray-3",
      name: "Luma Labs Ray 3",
      brand: "Luma Labs",
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

  // Get all existing model slugs from database
  const existingModels = await prisma.model.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existingModels.map((m) => m.slug));
  const newSlugs = new Set(models.map((m) => m.slug));

  // Delete models that are not in the new list
  const slugsToDelete = [...existingSlugs].filter(
    (slug) => !newSlugs.has(slug)
  );
  if (slugsToDelete.length > 0) {
    console.log(`Deleting ${slugsToDelete.length} old models...`);
    await prisma.model.deleteMany({
      where: { slug: { in: slugsToDelete } },
    });
  }

  // Upsert all models
  for (const model of models) {
    await prisma.model.upsert({
      where: { slug: model.slug },
      update: {
        name: model.name,
        brand: model.brand,
        providerId: model.provider.id,
        endpoint: model.endpoint,
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

  console.log(`Seeded ${models.length} models successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
