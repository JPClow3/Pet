import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";

const cloudflareConfig: OpenNextConfig = {
  ...defineCloudflareConfig(),
  // OpenNext infers pnpm from the lockfile. Running the already-installed
  // toolchain through npm avoids pnpm's platform-optional lockfile repair on
  // Windows while keeping the same Next.js build script in every environment.
  buildCommand: "npm run build",
};

export default cloudflareConfig;
