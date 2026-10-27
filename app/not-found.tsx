import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-6xl font-bold text-muted-foreground">404</p>
          <h1 className="font-display text-3xl font-bold">Page not found</h1>
          <p className="text-muted-foreground">
            This comparison or model doesn&apos;t exist, or it isn&apos;t public yet.
          </p>
          <div className="flex gap-4 justify-center pt-2">
            <Link
              href="/comparisons"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Browse comparisons
            </Link>
            <Link href="/" className="px-4 py-2 border border-input rounded-md hover:bg-accent">
              Go home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
