import assert from "node:assert/strict";
import { mock, test } from "node:test";

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

let loggedRouteErrors: unknown[][] = [];
let reportedRouteErrors: unknown[] = [];
let reportErrorToObservability = async (event: unknown) => {
  reportedRouteErrors.push(event);
};

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logError: (...args: unknown[]) => {
      loggedRouteErrors.push(args);
    },
  }),
});

mock.module("@/lib/platform/observability/error-reporter", {
  ...mockModuleOptions({
    reportErrorToObservability: (event: unknown) =>
      reportErrorToObservability(event),
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test.afterEach(() => {
  loggedRouteErrors = [];
  reportedRouteErrors = [];
  reportErrorToObservability = async (event: unknown) => {
    reportedRouteErrors.push(event);
  };
});

test("handleRoute returns json success payloads from plain objects", async () => {
  const routeHandler = await importFresh<
    typeof import("../lib/platform/http/route-handler.ts")
  >("../lib/platform/http/route-handler.ts");

  const response = await routeHandler.handleRoute(async () => ({
    ok: true,
    value: 42,
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    value: 42,
  });
});

test("handleRoute converts RouteError throws into structured json payloads", async () => {
  const [{ handleRoute }, { RouteError }] = await Promise.all([
    importFresh<typeof import("../lib/platform/http/route-handler.ts")>(
      "../lib/platform/http/route-handler.ts"
    ),
    importFresh<typeof import("../lib/platform/http/route-errors.ts")>(
      "../lib/platform/http/route-errors.ts"
    ),
  ]);

  const response = await handleRoute(async () => {
    throw new RouteError("Invalid payload", 400);
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: "invalid_payload",
      message: "Invalid payload",
    },
  });
});

test("handleRoute logs unexpected errors before returning a 500 payload", async () => {
  const routeHandler = await importFresh<typeof import("../lib/platform/http/route-handler.ts")>(
    "../lib/platform/http/route-handler.ts"
  );

  const response = await routeHandler.handleRoute(async () => {
    throw new Error("boom");
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: "internal_error",
      message: "boom",
    },
  });
  assert.equal(loggedRouteErrors.length, 1);
  assert.equal(loggedRouteErrors[0]?.[0], "Unhandled route error");
  assert.equal(reportedRouteErrors.length, 1);
});

test("handleRoute does not wait for observability delivery before returning 500 responses", async () => {
  let hasReleaseReport = false;
  let releaseReport = () => {};
  reportErrorToObservability = async (event: unknown) => {
    reportedRouteErrors.push(event);
    await new Promise<void>((resolve) => {
      hasReleaseReport = true;
      releaseReport = resolve;
    });
  };

  const routeHandler = await importFresh<typeof import("../lib/platform/http/route-handler.ts")>(
    "../lib/platform/http/route-handler.ts"
  );

  const responsePromise = routeHandler.handleRoute(async () => {
    throw new Error("boom");
  });

  const raceResult = await Promise.race([
    responsePromise.then(() => "resolved" as const),
    new Promise<"pending">((resolve) => {
      setTimeout(() => resolve("pending"), 20);
    }),
  ]);

  assert.equal(raceResult, "resolved");

  const response = await responsePromise;
  assert.equal(response.status, 500);
  assert.equal(reportedRouteErrors.length, 1);

  if (hasReleaseReport) {
    releaseReport();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
});
