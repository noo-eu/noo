import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

Sentry.init({
  dsn: "https://f28abd9072794c298558b55a8054553c@o4508998051037184.ingest.de.sentry.io/4509077396586576",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1,

  enabled: process.env.NODE_ENV === "production",
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
