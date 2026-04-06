import assert from "node:assert/strict";
import { mock, test } from "node:test";

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

const fetchCalls: Array<{ input: unknown; init?: RequestInit }> = [];
const spanExceptions: unknown[] = [];
const spanStatuses: unknown[] = [];
const warnings: unknown[][] = [];

mock.module("@/lib/config/server-env", {
  ...mockModuleOptions({
    serverEnv: {
      observability: {
        webhookUrl: "https://observability.example.test/errors",
        token: "token-123",
        serviceName: "family-meal-tracker",
      },
      deploymentVersion: "test-build",
      isProduction: false,
    },
  }),
});

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logWarn: (...args: unknown[]) => {
      warnings.push(args);
    },
  }),
});

mock.module("@opentelemetry/api", {
  ...mockModuleOptions({
    SpanStatusCode: {
      ERROR: 2,
    },
    trace: {
      getActiveSpan: () => ({
        recordException: (error: unknown) => {
          spanExceptions.push(error);
        },
        setStatus: (status: unknown) => {
          spanStatuses.push(status);
        },
      }),
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test.afterEach(() => {
  fetchCalls.length = 0;
  spanExceptions.length = 0;
  spanStatuses.length = 0;
  warnings.length = 0;
});

test("reportErrorToObservability forwards structured payloads to the configured webhook", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  try {
    const reporter = await importFresh<
      typeof import("../lib/platform/observability/error-reporter.ts")
    >("../lib/platform/observability/error-reporter.ts");

    await reporter.reportErrorToObservability({
      source: "route-handler",
      code: "internal_error",
      message: "boom",
      error: new Error("boom"),
      context: { status: 500 },
    });

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0]?.input, "https://observability.example.test/errors");
    assert.equal(
      new Headers(fetchCalls[0]?.init?.headers).get("authorization"),
      "Bearer token-123"
    );
    assert.equal(
      new Headers(fetchCalls[0]?.init?.headers).get("content-type"),
      "application/json"
    );
    assert.equal(spanExceptions.length, 1);
    assert.equal(spanStatuses.length, 1);
    assert.equal(warnings.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
