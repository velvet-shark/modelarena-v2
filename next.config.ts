import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Only optimize images from our own R2 bucket. next/image config is baked in at
// build time, so R2_PUBLIC_URL must be set as a build variable; without it we
// serve images unoptimized rather than leave /_next/image open to any host.
const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

if (!r2Host) {
  console.warn("[next.config] R2_PUBLIC_URL not set at build time; next/image optimization disabled");
}

const analyticsOrigin = "https://pls.velvetshark.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js App Router emits inline bootstrap scripts; dev needs eval for fast refresh
  `script-src 'self' 'unsafe-inline' ${analyticsOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  // https: covers direct-to-R2 uploads and the analytics event endpoint
  `connect-src 'self' https:${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: r2Host
    ? { remotePatterns: [{ protocol: "https", hostname: r2Host }] }
    : { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
