import { PrismaClient } from "@prisma/client";

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

  // Create models
  const models = [
    // Kling
    {
      slug: "kling-2.5-turbo-standard",
      name: "Kling 2.5 Turbo Standard",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "kling-2.5-turbo-pro",
      name: "Kling 2.5 Turbo Pro",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "kling-o1",
      name: "Kling AI O1",
      provider: falProvider,
      endpoint: "fal-ai/kling-video/o1/image-to-video",
      capabilities: [imageToVideo],
    },
    // Runway
    {
      slug: "runway-gen4-turbo",
      name: "Runway Gen-4 Turbo",
      provider: runwayProvider,
      endpoint: "gen4_turbo",
      capabilities: [imageToVideo],
    },
    // Veo
    {
      slug: "veo-3.1-reference",
      name: "Veo 3.1 Reference",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/reference-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "veo-3.1-fast",
      name: "Veo 3.1 Fast",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/fast/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "veo-3.1",
      name: "Veo 3.1",
      provider: falProvider,
      endpoint: "fal-ai/veo3.1/image-to-video",
      capabilities: [imageToVideo],
    },
    // Sora
    {
      slug: "sora-2-pro",
      name: "Sora 2 Pro",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video/pro",
      capabilities: [imageToVideo],
    },
    {
      slug: "sora-2",
      name: "Sora 2",
      provider: falProvider,
      endpoint: "fal-ai/sora-2/image-to-video",
      capabilities: [imageToVideo],
    },
    // Hailuo / MiniMax
    {
      slug: "hailuo-2.3-pro",
      name: "Hailuo 2.3 Pro",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "hailuo-2.3-standard",
      name: "Hailuo 2.3 Standard",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "hailuo-2.3-fast-standard",
      name: "Hailuo 2.3 Fast Standard",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "hailuo-2.3-fast-pro",
      name: "Hailuo 2.3 Fast Pro",
      provider: falProvider,
      endpoint: "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video",
      capabilities: [imageToVideo],
    },
    // Wan
    {
      slug: "wan-2.5-preview",
      name: "Wan 2.5 Preview",
      provider: falProvider,
      endpoint: "fal-ai/wan-25-preview/image-to-video",
      capabilities: [imageToVideo],
    },
    // Seedance
    {
      slug: "seedance-1.0-pro-fast",
      name: "Seedance 1.0 Pro Fast",
      provider: falProvider,
      endpoint: "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
      capabilities: [imageToVideo],
    },
    // Vidu
    {
      slug: "vidu-q2-turbo",
      name: "Vidu Q2 Turbo",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/turbo",
      capabilities: [imageToVideo],
    },
    {
      slug: "vidu-q2-pro",
      name: "Vidu Q2 Pro",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/image-to-video/pro",
      capabilities: [imageToVideo],
    },
    {
      slug: "vidu-q2-reference",
      name: "Vidu Q2 Reference",
      provider: falProvider,
      endpoint: "fal-ai/vidu/q2/reference-to-video",
      capabilities: [imageToVideo],
    },
    // Luma
    {
      slug: "luma-ray-2-flash",
      name: "Luma Ray 2 Flash",
      provider: falProvider,
      endpoint: "fal-ai/luma-dream-machine/ray-2-flash/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "luma-ray-2",
      name: "Luma Ray 2",
      provider: falProvider,
      endpoint: "fal-ai/luma-dream-machine/ray-2/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "luma-ray-3",
      name: "Luma Ray 3",
      provider: manualProvider,
      endpoint: null,
      capabilities: [imageToVideo],
    },
    // Pika
    {
      slug: "pika-2.2",
      name: "Pika 2.2",
      provider: falProvider,
      endpoint: "fal-ai/pika/v2.2/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "pika-2-turbo",
      name: "Pika 2 Turbo",
      provider: falProvider,
      endpoint: "fal-ai/pika/v2/turbo/image-to-video",
      capabilities: [imageToVideo],
    },
    {
      slug: "pika-2.5",
      name: "Pika 2.5",
      provider: manualProvider,
      endpoint: null,
      capabilities: [imageToVideo],
    },
  ];

  for (const model of models) {
    await prisma.model.upsert({
      where: { slug: model.slug },
      update: {},
      create: {
        slug: model.slug,
        name: model.name,
        providerId: model.provider.id,
        endpoint: model.endpoint,
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
