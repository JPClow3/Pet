import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG ?? "joao-paulo-goncalves-santos",
  project: process.env.SENTRY_PROJECT ?? "pethub",
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
