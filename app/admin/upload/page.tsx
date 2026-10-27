import prisma from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import { VideoUploadForm } from "@/components/video-upload-form";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  await requireAdminPage();

  const [comparisons, models] = await Promise.all([
    prisma.comparison.findMany({
      select: { id: true, title: true, type: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.model.findMany({
      where: { isActive: true },
      select: { id: true, name: true, provider: { select: { displayName: true } } },
      orderBy: [{ provider: { displayName: "asc" } }, { name: "asc" }],
    }),
  ]);

  return <VideoUploadForm comparisons={comparisons} models={models} />;
}
