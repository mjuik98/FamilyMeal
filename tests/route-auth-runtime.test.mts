import assert from "node:assert/strict";
import { mock, test } from "node:test";

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

const verifiedUser = {
  uid: "user-1",
  email: "user-1@example.com",
};

let loadedRole: string | null = "엄마";
const callLog = {
  verifyCalls: 0,
  loadRoleCalls: 0,
};

mock.module("@/lib/platform/auth/server-auth", {
  ...mockModuleOptions({
    verifyRequestUser: async () => {
      callLog.verifyCalls += 1;
      return verifiedUser;
    },
  }),
});

mock.module("@/lib/modules/profile/server/profile-auth-context", {
  ...mockModuleOptions({
    loadUserRoleForUser: async (uid: string) => {
      callLog.loadRoleCalls += 1;
      assert.equal(uid, verifiedUser.uid);
      return loadedRole;
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("requireValidatedUserRole composes verified auth with a profile-owned role loader", async () => {
  const routeAuth = await importFresh<typeof import("../lib/platform/auth/route-auth.ts")>(
    "../lib/platform/auth/route-auth.ts"
  );

  const result = await routeAuth.requireValidatedUserRole(
    new Request("http://localhost/api/meals", {
      headers: {
        Authorization: "Bearer test-token",
      },
    })
  );

  assert.deepEqual(result, {
    user: verifiedUser,
    role: "엄마",
  });
  assert.equal(callLog.verifyCalls, 1);
  assert.equal(callLog.loadRoleCalls, 1);
});

test("requireValidatedUserRole supports custom role validation over the loaded profile role", async () => {
  loadedRole = "아빠";
  const routeAuth = await importFresh<typeof import("../lib/platform/auth/route-auth.ts")>(
    "../lib/platform/auth/route-auth.ts"
  );

  const result = await routeAuth.requireValidatedUserRole(
    new Request("http://localhost/api/archive", {
      headers: {
        Authorization: "Bearer test-token",
      },
    }),
    (role) => {
      assert.equal(role, "아빠");
      return "아빠";
    }
  );

  assert.equal(result.role, "아빠");
});

test("requireValidatedUserRole fails closed when the loaded profile role is missing", async () => {
  loadedRole = null;
  const routeAuth = await importFresh<typeof import("../lib/platform/auth/route-auth.ts")>(
    "../lib/platform/auth/route-auth.ts"
  );

  await assert.rejects(
    () =>
      routeAuth.requireValidatedUserRole(
        new Request("http://localhost/api/meals", {
          headers: {
            Authorization: "Bearer test-token",
          },
        })
      ),
    /Valid user role is required/
  );
});
