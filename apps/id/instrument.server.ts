import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: process.env.NONSECRET_SENTRY_DSN,
  tracesSampleRate: 1,

  enabled: process.env.NODE_ENV === "production",
});
