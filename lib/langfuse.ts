import { Langfuse } from "langfuse";

// Singleton — initialized once per cold start
let langfuseInstance: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return null; // Gracefully degrade — app works fine without Langfuse
  }

  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
      flushAt: 15,
      flushInterval: 10000,
    });

    process.on("SIGTERM", () => langfuseInstance?.shutdownAsync());
    process.on("SIGINT", () => langfuseInstance?.shutdownAsync());
  }

  return langfuseInstance;
}

/**
 * Trace an AI operation with Langfuse.
 * Returns the result of the operation, with automatic error capture.
 */
export async function traceAI<T>(
  name: string,
  metadata: Record<string, unknown>,
  fn: (span: { update: (data: Record<string, unknown>) => void }) => Promise<T>,
  userId?: string
): Promise<T> {
  const lf = getLangfuse();

  if (!lf) {
    return fn({ update: () => {} });
  }

  const trace = lf.trace({
    name,
    metadata,
    userId: userId || undefined,
    sessionId: metadata.sessionId as string | undefined,
  });

  const span = trace.span({ name, input: metadata });

  try {
    const result = await fn({
      update: (data) => {
        span.update(data);
      },
    });

    span.end({ output: result });
    return result;
  } catch (error) {
    span.update({
      output: null,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
    span.end();
    throw error;
  }
}
