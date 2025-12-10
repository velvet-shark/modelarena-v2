import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-inter"
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: "ModelArena - AI Video Generation Comparison",
    template: "%s | ModelArena",
  },
  description:
    "Benchmark and compare AI video generation models side-by-side. Test Kling, Runway, Veo, Sora, Hailuo, and more with identical prompts.",
  keywords: [
    "AI video generation",
    "video model comparison",
    "Kling",
    "Runway",
    "Veo",
    "Sora",
    "Hailuo",
    "AI benchmarks",
    "image-to-video",
    "text-to-video",
  ],
  authors: [{ name: "ModelArena" }],
  creator: "ModelArena",
  publisher: "ModelArena",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "https://modelarena.ai",
    siteName: "ModelArena",
    title: "ModelArena - AI Video Generation Comparison",
    description:
      "Benchmark and compare AI video generation models side-by-side. Test Kling, Runway, Veo, Sora, Hailuo, and more with identical prompts.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ModelArena - AI Video Generation Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ModelArena - AI Video Generation Comparison",
    description:
      "Benchmark and compare AI video generation models side-by-side.",
    images: ["/og-image.png"],
    creator: "@modelarena",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${outfit.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
