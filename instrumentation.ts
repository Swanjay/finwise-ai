export async function register() {
  // This file is used by Next.js to register instrumentation.
  // Sentry uses this for server/edge init.

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
