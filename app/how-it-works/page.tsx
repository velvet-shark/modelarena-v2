import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Layers, LayoutGrid, Heart, Zap, DollarSign, Clock, Users } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-20">
        {/* Hero */}
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            How ModelArena Works
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground">
            ModelArena is the definitive platform for comparing AI video generation models.
            We test multiple models with identical prompts so you can see real, unbiased results.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-10 sm:space-y-16">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start">
            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="font-display text-3xl sm:text-5xl font-bold text-muted-foreground/30">01</span>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
                  Same Prompt, Multiple Models
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                We run the exact same prompt (and source image for image-to-video) through
                multiple AI video generation models simultaneously. This ensures a fair,
                apples-to-apples comparison. No cherry-picking, no selective editing.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start">
            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="font-display text-3xl sm:text-5xl font-bold text-muted-foreground/30">02</span>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
                  Side-by-Side Comparison
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                View all results on a single page. Play videos simultaneously, compare quality,
                check motion coherence, and evaluate style. Each video shows generation time
                and cost, so you can factor in speed and budget alongside visual quality.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start">
            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="font-display text-3xl sm:text-5xl font-bold text-muted-foreground/30">03</span>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
                  Community Voting
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Vote for the videos you think look best. Community votes help identify which
                models consistently produce high-quality results. Over time, patterns emerge
                that show which models excel at different types of content.
              </p>
            </div>
          </div>
        </div>

        {/* Why ModelArena */}
        <div className="space-y-6 sm:space-y-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">Why ModelArena?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Unbiased Testing</h3>
              <p className="text-sm text-muted-foreground">
                Every model gets the same prompt. No favoritism, no cherry-picked examples.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Cost Tracking</h3>
              <p className="text-sm text-muted-foreground">
                See exactly how much each generation costs. Compare value, not just quality.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Speed Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Generation time matters. Know which models deliver fast results.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">20+ Models</h3>
              <p className="text-sm text-muted-foreground">
                Compare Kling, Runway, Veo, Sora, Hailuo, Luma, Pika, and many more.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
