import assert from "node:assert/strict";
import { mock, test } from "node:test";

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AuthCallback = (user: unknown) => void | Promise<void>;

let authCallback: AuthCallback | null = null;
let nextProfileResolver: ((value: unknown) => void) | null = null;

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/firebase", {
  ...mockModuleOptions({
    auth: {
      currentUser: null,
      onAuthStateChanged: (callback: AuthCallback) => {
        authCallback = callback;
        return () => {
          authCallback = null;
        };
      },
    },
  }),
});

mock.module("@/lib/qa/runtime", {
  ...mockModuleOptions({
    clearQaRuntimeSession: () => undefined,
    getQaUserContextValue: () => ({ user: null, userProfile: null }),
    isQaRuntimeActive: () => false,
    saveQaRuntimeNotificationPreferences: (_preferences: unknown, prev: unknown) => prev,
    setQaRuntimeRole: (_role: unknown, prev: unknown) => prev,
  }),
});

mock.module("@/lib/client/activity", {
  ...mockModuleOptions({
    updateNotificationPreferences: async (preferences: unknown) => preferences,
  }),
});

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logError: () => undefined,
  }),
});

mock.module("@/lib/client/profile-session", {
  ...mockModuleOptions({
    buildFallbackUserProfile: (firebaseUser: { uid: string }) => ({
      uid: firebaseUser.uid,
      email: null,
      displayName: null,
      role: null,
    }),
    loadUserProfile: async () =>
      new Promise((resolve) => {
        nextProfileResolver = resolve;
      }),
    saveUserRole: async () => ({
      uid: "user-1",
      email: null,
      displayName: null,
      role: "엄마",
    }),
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("UserProvider ignores stale profile loads after auth state changes", async () => {
  const userContextModule = await importFresh<typeof import("../context/UserContext.tsx")>(
    "../context/UserContext.tsx"
  );

  const snapshots: Array<{ userUid: string | null; profileUid: string | null }> = [];

  const Observer = () => {
    const value = userContextModule.useUser();
    snapshots.push({
      userUid: value.user?.uid ?? null,
      profileUid: value.userProfile?.uid ?? null,
    });
    return null;
  };

  let renderer: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(userContextModule.UserProvider, null, React.createElement(Observer))
    );
  });

  const staleUser = {
    uid: "user-1",
    email: "user-1@test.com",
    displayName: "User One",
  };

  await act(async () => {
    assert.ok(authCallback);
    void authCallback(staleUser);
  });

  await act(async () => {
    assert.ok(authCallback);
    await authCallback(null);
  });

  await act(async () => {
    assert.ok(nextProfileResolver);
    nextProfileResolver({
      uid: "user-1",
      email: "user-1@test.com",
      displayName: "User One",
      role: "엄마",
    });
    await Promise.resolve();
  });

  const lastSnapshot = snapshots[snapshots.length - 1];
  assert.deepEqual(lastSnapshot, {
    userUid: null,
    profileUid: null,
  });

  await act(async () => {
    renderer?.unmount();
  });
});
