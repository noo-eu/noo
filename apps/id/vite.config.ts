import { reactRouter } from "@react-router/dev/vite";
import {
  sentryReactRouter,
  type SentryReactRouterBuildOptions,
} from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import tsconfigPaths from "vite-tsconfig-paths";

const sentryConfig: SentryReactRouterBuildOptions = {
  org: "noo-eu",
  project: "noo-id",
  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourceMapsUploadOptions: {
    filesToDeleteAfterUpload: [],
  },
};

export default defineConfig((config) => ({
  plugins: [
    mkcert(),
    tailwindcss(),
    !process.env.UNIT && reactRouter(),
    tsconfigPaths(),
    sentryReactRouter(sentryConfig, config),
  ],

  envPrefix: "NONSECRET_",

  server: {
    cors: { preflightContinue: true },
  },

  sentryConfig,

  build: {
    sourcemap: true,
  },

  // Until https://github.com/remix-run/react-router/issues/12568
  resolve:
    process.env.NODE_ENV !== "production"
      ? {}
      : {
          alias: {
            "react-dom/server": "react-dom/server.node",
          },
        },

  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "lcov", "html"],
      include: ["app/**/*"],
    },
    environment: "node",
    env: {
      PAIRWISE_SALT: "test",
      OIDC_ISSUER: "https://localhost:23000/oidc",
    },
    exclude: ["tests/**/*", "node_modules/**/*"],
    setupFiles: ["./tests/vitest-setup.ts"],
  },
}));
