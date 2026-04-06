import assert from "node:assert/strict";
import { test } from "node:test";

import { z } from "zod";

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("parseJsonBody returns parsed data when the JSON payload is valid", async () => {
  const { parseJsonBody } = await importFresh<
    typeof import("../lib/platform/http/request-body.ts")
  >("../lib/platform/http/request-body.ts");

  const payload = await parseJsonBody(
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ value: 42 }),
    }),
    {
      schema: z.object({
        value: z.number().int(),
      }),
    }
  );

  assert.deepEqual(payload, { value: 42 });
});

test("parseJsonBody throws a shared RouteError for invalid JSON and invalid payloads", async () => {
  const [{ parseJsonBody }, { RouteError }] = await Promise.all([
    importFresh<typeof import("../lib/platform/http/request-body.ts")>(
      "../lib/platform/http/request-body.ts"
    ),
    importFresh<typeof import("../lib/platform/http/route-errors.ts")>(
      "../lib/platform/http/route-errors.ts"
    ),
  ]);

  await assert.rejects(
    () =>
      parseJsonBody(
        new Request("http://localhost/api/test", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: "{",
        })
      ),
    (error: unknown) =>
      error instanceof RouteError &&
      error.message === "Invalid JSON body" &&
      error.status === 400
  );

  await assert.rejects(
    () =>
      parseJsonBody(
        new Request("http://localhost/api/test", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ value: "nope" }),
        }),
        {
          schema: z.object({
            value: z.number().int(),
          }),
        }
      ),
    (error: unknown) =>
      error instanceof RouteError &&
      error.message === "Invalid payload" &&
      error.status === 400
  );
});

test("parseJsonBody supports custom error factories for module-specific route errors", async () => {
  const { parseJsonBody } = await importFresh<
    typeof import("../lib/platform/http/request-body.ts")
  >("../lib/platform/http/request-body.ts");

  class CustomBodyError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.name = "CustomBodyError";
      this.status = status;
    }
  }

  await assert.rejects(
    () =>
      parseJsonBody(
        new Request("http://localhost/api/test", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: "{",
        }),
        {
          createError: (message, status = 400) => new CustomBodyError(message, status),
        }
      ),
    (error: unknown) =>
      error instanceof CustomBodyError &&
      error.message === "Invalid JSON body" &&
      error.status === 400
  );
});
