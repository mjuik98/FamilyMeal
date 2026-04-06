import { SpanStatusCode, trace } from "@opentelemetry/api";

import { serverEnv } from "@/lib/config/server-env";
import { logWarn } from "@/lib/logging";

export type ObservabilityErrorEvent = {
  source: string;
  code: string;
  message: string;
  error?: unknown;
  stack?: string;
  context?: Record<string, unknown>;
};

const WEBHOOK_TIMEOUT_MS = 1_500;

const getErrorStack = (event: ObservabilityErrorEvent): string | undefined => {
  if (typeof event.stack === "string" && event.stack.trim().length > 0) {
    return event.stack;
  }

  if (event.error instanceof Error && event.error.stack) {
    return event.error.stack;
  }

  return undefined;
};

const recordActiveSpanException = (event: ObservabilityErrorEvent) => {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return;
  }

  const exception =
    event.error instanceof Error ? event.error : new Error(event.message);

  activeSpan.recordException(exception);
  activeSpan.setStatus({
    code: SpanStatusCode.ERROR,
    message: event.message,
  });
};

const buildWebhookPayload = (event: ObservabilityErrorEvent) => ({
  source: event.source,
  code: event.code,
  message: event.message,
  stack: getErrorStack(event),
  context: event.context,
  service: serverEnv.observability.serviceName,
  environment: serverEnv.isProduction ? "production" : "development",
  release: serverEnv.deploymentVersion,
  happenedAt: new Date().toISOString(),
});

const getWebhookSignal = (): AbortSignal | undefined => {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }

  return AbortSignal.timeout(WEBHOOK_TIMEOUT_MS);
};

export const reportErrorToObservability = async (
  event: ObservabilityErrorEvent
): Promise<void> => {
  recordActiveSpanException(event);

  if (!serverEnv.observability.webhookUrl) {
    return;
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (serverEnv.observability.token) {
    headers.set("Authorization", `Bearer ${serverEnv.observability.token}`);
  }

  try {
    const response = await fetch(serverEnv.observability.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(buildWebhookPayload(event)),
      cache: "no-store",
      signal: getWebhookSignal(),
    });

    if (!response.ok) {
      logWarn("Observability webhook rejected error payload", undefined, {
        status: response.status,
        source: event.source,
        code: event.code,
      });
    }
  } catch (error) {
    logWarn("Failed to report error to observability", error, {
      source: event.source,
      code: event.code,
    });
  }
};
