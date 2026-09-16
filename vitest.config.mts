import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";

const alias = {
  "@": path.resolve(process.cwd(), "src"),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["src/lib/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/components/**/*.test.tsx"],
        },
      },
    ],
  },
});
