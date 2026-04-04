import assert from "node:assert/strict";
import { mock, test } from "node:test";

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/firebase", {
  ...mockModuleOptions({
    auth: {
      currentUser: {
        getIdToken: async () => "test-token",
      },
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("fetchAuthedJson throws a typed error with status and code from structured route payloads", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "meal_not_found",
          message: "Meal not found",
        },
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  ) as typeof fetch;

  try {
    const authHttp = await importFresh<typeof import("../lib/client/auth-http.ts")>(
      "../lib/client/auth-http.ts"
    );

    await assert.rejects(
      () => authHttp.fetchAuthedJson("/api/meals/missing"),
      (error) => {
        if (!(error instanceof Error)) {
          return false;
        }

        const codedError = error as Error & {
          code?: unknown;
          status?: unknown;
        };

        return (
          codedError.message === "Meal not found" &&
          codedError.code === "meal_not_found" &&
          codedError.status === 404
        );
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
