/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { ViteUserConfig, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()] as ViteUserConfig["plugins"],
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*"],
    },
    environment: "node",
    env: {
      PAIRWISE_SALT: "helloworld",
    },
    exclude: ["tests/**/*"],
    setupFiles: ["./tests/vitest-setup.ts"],
  },
});
