import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*"],
    },
    environment: "node",
    exclude: ["tests/**/*", "node_modules/**/*"],
    setupFiles: ["./tests/vitest-setup.ts"],
  },
});
