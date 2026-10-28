import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        source: "/account",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/p/:code*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default async function config() {
  const configured = withSerwist(nextConfig);
  if (
    !process.env.SENTRY_DSN &&
    !process.env.NEXT_PUBLIC_SENTRY_DSN &&
    !process.env.SENTRY_AUTH_TOKEN
  ) {
    return configured;
  }
  const { withSentryConfig } = await import("@sentry/nextjs/config");
  return withSentryConfig(configured, {
    org: process.env.SENTRY_ORG ?? "joao-paulo-goncalves-santos",
    project: process.env.SENTRY_PROJECT ?? "pethub",
    silent: true,
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
    },
  });
}
