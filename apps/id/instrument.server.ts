import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "https://dd4b1a47953a8fadd4b1e90d14f7058d@o4508998051037184.ingest.de.sentry.io/4508998052282448",
  tracesSampleRate: 1,

  enabled: process.env.NODE_ENV === "production",
});
