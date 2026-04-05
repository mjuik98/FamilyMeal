import assert from "node:assert/strict";
import { test } from "node:test";

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

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
    importFresh<typeof import("../lib/route-errors.ts")>(
      "../lib/route-errors.ts"
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
