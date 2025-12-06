import prisma from "@/lib/prisma";
import { GenerateForm } from "@/components/generate-form";

export default async function GeneratePage() {
  // Fetch all active models grouped by provider
  const models = await prisma.model.findMany({
    where: { isActive: true },
    include: {
      provider: true,
      capabilities: true,
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
