import { PrismaClient } from "@prisma/client";
import { HIGGSFIELD_MODELS, HIGGSFIELD_PROVIDER } from "./higgsfield-models";

// Adds the Higgsfield provider and models without touching anything else.
// Use this on production instead of `pnpm db:seed`, which deletes every model
// missing from its list. Safe to run again.
//
//   DATABASE_URL=... pnpm tsx prisma/add-higgsfield.ts

const prisma = new PrismaClient();

async function main() {
  const capabilities = await Promise.all(
    ["text-to-video", "image-to-video"].map((name) =>
      prisma.capability.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const provider = await prisma.provider.upsert({
    where: { name: HIGGSFIELD_PROVIDER.name },
    update: { displayName: HIGGSFIELD_PROVIDER.displayName },
    create: HIGGSFIELD_PROVIDER,
  });

  for (const model of HIGGSFIELD_MODELS) {
    const fields = { name: model.name, brand: model.brand, providerId: provider.id, endpoint: null, endpointT2V: null };
    await prisma.model.upsert({
      where: { slug: model.slug },
      update: { ...fields, capabilities: { set: capabilities.map((c) => ({ id: c.id })) } },
      create: { slug: model.slug, ...fields, capabilities: { connect: capabilities.map((c) => ({ id: c.id })) } },
    });
    console.log(`ok  ${model.slug}`);
  }

  console.log(`Higgsfield provider and ${HIGGSFIELD_MODELS.length} models in place`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
