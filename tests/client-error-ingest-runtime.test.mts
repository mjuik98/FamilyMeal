import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const limiterKeys: string[] = [];
const reportedErrors: unknown[] = [];
const loggedErrors: unknown[][] = [];

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/config/server-env", {
  ...mockModuleOptions({
    serverEnv: {
      upstash: {
        url: "https://upstash.example.test",
        token: "token-123",
      },
      observability: {
        webhookUrl: undefined,
        token: undefined,
        serviceName: "family-meal-tracker",
      },
      isProduction: false,
      deploymentVersion: "test-build",
    },
  }),
});

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logError: (...args: unknown[]) => {
      loggedErrors.push(args);
    },
  }),
});

mock.module("@/lib/platform/observability/error-reporter", {
  ...mockModuleOptions({
    reportErrorToObservability: async (event: unknown) => {
      reportedErrors.push(event);
    },
  }),
});

mock.module("@upstash/redis", {
  ...mockModuleOptions({
    Redis: class MockRedis {
      constructor(options: unknown) {
        void options;
      }
    },
  }),
});

mock.module("@upstash/ratelimit", {
  ...mockModuleOptions({
    Ratelimit: class MockRatelimit {
      static slidingWindow(limit: number, window: string) {
        void limit;
        void window;
        return { kind: "sliding-window" };
      }

      constructor(options: unknown) {
        void options;
      }

      async limit(key: string) {
        limiterKeys.push(key);
        return { success: true };
      }
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

const createRequest = (headers: Record<string, string>) =>
  new Request("http://localhost/api/client-errors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      type: "error",
      message: "boom",
      url: "http://localhost/meals/1?debug=true",
      source: "http://localhost/app.js?cache=1",
    }),
  });

afterEach(() => {
  limiterKeys.length = 0;
  reportedErrors.length = 0;
  loggedErrors.length = 0;
});

test("client error rate limiting ignores spoofable forwarding headers outside trusted platform headers", async () => {
  const { ingestClientErrorReport } = await importFresh<
    typeof import("../lib/platform/http/client-error-ingest.ts")
  >("../lib/platform/http/client-error-ingest.ts");

  await ingestClientErrorReport(
    createRequest({
      "x-real-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "FamilyMealQA/1.0",
      "accept-language": "ko-KR",
    })
  );

  await ingestClientErrorReport(
    createRequest({
      "x-real-ip": "192.0.2.10",
      "x-forwarded-for": "192.0.2.11",
      "user-agent": "FamilyMealQA/1.0",
      "accept-language": "ko-KR",
    })
  );

  assert.equal(limiterKeys.length, 2);
  assert.equal(limiterKeys[0], limiterKeys[1]);
  assert.notEqual(limiterKeys[0], "198.51.100.10");
  assert.notEqual(limiterKeys[1], "192.0.2.10");
});

test("client error rate limiting prefers the trusted Vercel forwarding header when present", async () => {
  const { ingestClientErrorReport } = await importFresh<
    typeof import("../lib/platform/http/client-error-ingest.ts")
  >("../lib/platform/http/client-error-ingest.ts");

  await ingestClientErrorReport(
    createRequest({
      "x-vercel-forwarded-for": "203.0.113.20, 203.0.113.21",
      "x-real-ip": "198.51.100.20",
      "user-agent": "FamilyMealQA/1.0",
    })
  );

  assert.equal(limiterKeys.length, 1);
  assert.equal(limiterKeys[0], "203.0.113.20");
});
