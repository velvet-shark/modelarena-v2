import prisma from "@/lib/prisma";
import { GenerateForm } from "@/components/generate-form";
import { requireAdminPage } from "@/lib/auth";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  await requireAdminPage();

  // Fetch all active models grouped by provider
  const models = await prisma.model.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      endpoint: true,
      endpointT2V: true,
      provider: { select: { id: true, name: true, displayName: true } },
      capabilities: { select: { id: true, name: true } },
    },
    orderBy: [{ provider: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Generate Comparison</h1>
        <p className="text-muted-foreground">
          Create a new video comparison across multiple AI models
        </p>
      </div>

      <GenerateForm models={models} />
    </div>
  );
}
