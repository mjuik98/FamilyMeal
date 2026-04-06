import assert from "node:assert/strict";
import { mock, test } from "node:test";

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AuthCallback = (user: unknown) => void | Promise<void>;

let authCallback: AuthCallback | null = null;
let nextProfileResolver: ((value: unknown) => void) | null = null;
let nextNotificationSaveError: Error | null = null;

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

mock.module("@/lib/qa/adapters/profile", {
  ...mockModuleOptions({
    clearQaRuntimeSession: () => undefined,
    getQaUserContextValue: () => ({ user: null, userProfile: null }),
    isQaUserSessionRuntimeActive: () => false,
    saveQaRuntimeNotificationPreferences: (_preferences: unknown, prev: unknown) => prev,
    setQaRuntimeRole: (_role: unknown, prev: unknown) => prev,
  }),
});

mock.module("@/lib/modules/profile/adapters/http/profile-notification-client", {
  ...mockModuleOptions({
    updateNotificationPreferences: async (preferences: unknown) => {
      if (nextNotificationSaveError) {
        const error = nextNotificationSaveError;
        nextNotificationSaveError = null;
        throw error;
      }
      return preferences;
    },
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

test("UserProvider keeps the previous profile and exposes authError when notification preference save fails", async () => {
  nextNotificationSaveError = new Error("save failed");

  const userContextModule = await importFresh<typeof import("../context/UserContext.tsx")>(
    "../context/UserContext.tsx"
  );

  const snapshots: Array<{ authError: string | null; profileRole: string | null }> = [];
  let latestValue: ReturnType<typeof userContextModule.useUser> | null = null;

  const Observer = () => {
    const value = userContextModule.useUser();
    latestValue = value;
    snapshots.push({
      authError: value.authError,
      profileRole: value.userProfile?.role ?? null,
    });
    return null;
  };

  let renderer: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(userContextModule.UserProvider, null, React.createElement(Observer))
    );
  });

  await act(async () => {
    assert.ok(authCallback);
    void authCallback({
      uid: "user-1",
      email: "user-1@test.com",
      displayName: "User One",
    });
  });

  await act(async () => {
    assert.ok(nextProfileResolver);
    nextProfileResolver({
      uid: "user-1",
      email: "user-1@test.com",
      displayName: "User One",
      role: "엄마",
      notificationPreferences: {
        browserEnabled: true,
        commentAlerts: true,
        reactionAlerts: true,
        replyAlerts: true,
      },
    });
    await Promise.resolve();
  });

  await act(async () => {
    await assert.rejects(
      async () =>
        latestValue?.updateNotificationPreferences({
          browserEnabled: false,
          commentAlerts: false,
          reactionAlerts: false,
          replyAlerts: false,
        }),
      /save failed/
    );
  });

  const lastSnapshot = snapshots[snapshots.length - 1];
  assert.deepEqual(lastSnapshot, {
    authError: "알림 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    profileRole: "엄마",
  });

  await act(async () => {
    renderer?.unmount();
  });
});
