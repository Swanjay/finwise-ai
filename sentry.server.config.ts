import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture more traces in production for server-side (it's cheaper)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  debug: false,

  environment: process.env.NODE_ENV,

  // Capture console.error as breadcrumbs
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
  ],
});
