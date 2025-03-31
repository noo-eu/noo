import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*"],
    },
    environment: "node",
    setupFiles: ["./vitest-setup.ts"],
  },
});
