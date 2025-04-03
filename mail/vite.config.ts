import { reactRouter } from "@react-router/dev/vite";
import {
  sentryReactRouter,
  type SentryReactRouterBuildOptions,
} from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const sentryConfig: SentryReactRouterBuildOptions = {
  org: "noo-eu",
  project: "noo-mail",
  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

export default defineConfig((config) => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    sentryReactRouter(sentryConfig, config),
  ],
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
}));
