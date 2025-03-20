import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
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
