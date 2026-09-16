import { createSerwistRoute } from "@serwist/turbopack";

const OFFLINE_REVISION = "1";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [
      { url: "/~offline", revision: OFFLINE_REVISION },
    ],
  });
