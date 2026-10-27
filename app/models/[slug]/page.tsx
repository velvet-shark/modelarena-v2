import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ModelVideoGrid } from "@/components/model-video-grid";
import { getPublicModel } from "@/lib/data/public";
import { siteUrl } from "@/lib/site";
import { formatCost } from "@/src/lib/format-cost";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

interface ModelPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ModelPageProps): Promise<Metadata> {
  const { slug } = await params;

  const model = await getPublicModel(slug);

  if (!model) {
    return {
      title: "Model Not Found",
    };
  }

  const capabilities = model.capabilities.map((c) => c.name).join(", ");
  const description = `${model.name} by ${model.provider.displayName} - View ${model.videoCount} AI-generated videos${capabilities ? `. Supports ${capabilities}` : ""}.`;
  const ogImageUrl = `${siteUrl}/api/og?type=model&slug=${encodeURIComponent(slug)}`;

  return {
    title: model.name,
    description,
    openGraph: {
      title: `${model.name} | ModelArena`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${model.name} - AI Video Generation Model`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${model.name} | ModelArena`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params;

  const model = await getPublicModel(slug);

  if (!model) {
    notFound();
  }

  const { avgGenerationTime, avgDuration, avgCost } = model;

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/models"
            className="hover:text-foreground transition-colors"
          >
            Models
          </Link>
          <span>/</span>
          <span className="text-foreground">{model.name}</span>
        </nav>

        {/* Model Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              {model.name}
            </h1>
            <p className="text-muted-foreground">
              via {model.provider.displayName}
            </p>
            {model.capabilities.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {model.capabilities.map((cap) => (
                  <span
                    key={cap.id}
                    className="bg-muted px-3 py-1 rounded-full text-sm"
                  >
                    {cap.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/models"
            className="inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
          >
            ← Back
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">Videos</div>
            <div className="font-display text-3xl font-bold mt-1">
              {model.videoCount}
            </div>
          </div>
          {avgGenerationTime != null && (
            <div className="rounded-xl border bg-card p-5">
              <div className="text-sm text-muted-foreground">Avg Gen Time</div>
              <div className="font-display text-3xl font-bold mt-1">
                {avgGenerationTime.toFixed(1)}s
              </div>
            </div>
          )}
          {avgDuration != null && (
            <div className="rounded-xl border bg-card p-5">
              <div className="text-sm text-muted-foreground">Avg Duration</div>
              <div className="font-display text-3xl font-bold mt-1">
                {avgDuration.toFixed(1)}s
              </div>
            </div>
          )}
          {avgCost != null && (
            <div className="rounded-xl border bg-card p-5">
              <div className="text-sm text-muted-foreground">Avg Cost</div>
              <div className="font-display text-3xl font-bold mt-1">
                {formatCost(avgCost)}
              </div>
            </div>
          )}
        </div>

        {/* Videos */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Recent Videos</h2>
          <ModelVideoGrid videos={model.videos} />
        </section>

        <Footer />
      </div>
    </main>
  );
}
