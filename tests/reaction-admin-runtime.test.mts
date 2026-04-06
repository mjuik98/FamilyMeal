import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const mealRecords = new Map<
  string,
  {
    ownerUid?: unknown;
    userIds?: unknown;
    userId?: unknown;
    reactions?: unknown;
    description?: unknown;
  }
>();
const commentRecords = new Map<
  string,
  {
    authorUid?: unknown;
    reactions?: unknown;
    text?: unknown;
  }
>();
const transactionUpdates: Array<{ ref: { mealId?: string; id: string }; payload: Record<string, unknown> }> = [];
const mealActivityCalls: unknown[] = [];
const commentActivityCalls: unknown[] = [];

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/firebase-admin", {
  ...mockModuleOptions({
    adminDb: {
      collection: (name: string) => {
        if (name !== "meals") {
          throw new Error(`Unsupported collection: ${name}`);
        }

        return {
          doc: (mealId: string) => ({
            id: mealId,
            kind: "meal" as const,
            collection: (subcollectionName: string) => {
              if (subcollectionName !== "comments") {
                throw new Error(`Unsupported subcollection: ${subcollectionName}`);
              }

              return {
                doc: (commentId: string) => ({
                  id: commentId,
                  mealId,
                  kind: "comment" as const,
                }),
              };
            },
          }),
        };
      },
      runTransaction: async (
        handler: (tx: {
          get: (ref: {
            kind: "meal" | "comment";
            id: string;
            mealId?: string;
          }) => Promise<{ exists: boolean; data: () => unknown }>;
          update: (ref: { id: string; mealId?: string }, payload: Record<string, unknown>) => void;
        }) => Promise<unknown>
      ) =>
        handler({
          get: async (ref) => {
            if (ref.kind === "meal") {
              const record = mealRecords.get(ref.id);
              return {
                exists: Boolean(record),
                data: () => record,
              };
            }

            const record = commentRecords.get(`${ref.mealId}:${ref.id}`);
            return {
              exists: Boolean(record),
              data: () => record,
            };
          },
          update: (ref, payload) => {
            transactionUpdates.push({ ref, payload });
          },
        }),
    },
  }),
});

mock.module("@/lib/modules/activity/server/activity-log", {
  ...mockModuleOptions({
    syncMealReactionActivity: (payload: unknown) => {
      mealActivityCalls.push(payload);
    },
    syncCommentReactionActivity: (payload: unknown) => {
      commentActivityCalls.push(payload);
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  mealRecords.clear();
  commentRecords.clear();
  transactionUpdates.length = 0;
  mealActivityCalls.length = 0;
  commentActivityCalls.length = 0;
});

test("toggleStoredMealReactionForUser rejects users who cannot view the meal", async () => {
  mealRecords.set("meal-1", {
    ownerUid: "owner-1",
    userIds: ["엄마"],
    description: "비공개 식사",
    reactions: {},
  });

  const [{ toggleStoredMealReactionForUser }, { RouteError }] = await Promise.all([
    importFresh<typeof import("../lib/modules/reactions/adapters/firestore/reaction-admin-store.ts")>(
      "../lib/modules/reactions/adapters/firestore/reaction-admin-store.ts"
    ),
    importFresh<typeof import("../lib/platform/http/route-errors.ts")>(
      "../lib/platform/http/route-errors.ts"
    ),
  ]);

  await assert.rejects(
    () =>
      toggleStoredMealReactionForUser({
        mealId: "meal-1",
        uid: "user-2",
        actorRole: "아빠",
        emoji: "❤️",
      }),
    (error: unknown) =>
      error instanceof RouteError &&
      error.status === 403 &&
      error.message === "Not allowed"
  );

  assert.equal(transactionUpdates.length, 0);
  assert.equal(mealActivityCalls.length, 0);
});

test("toggleStoredCommentReactionForUser rejects users who cannot view the meal", async () => {
  mealRecords.set("meal-1", {
    ownerUid: "owner-1",
    userIds: ["엄마"],
    description: "비공개 식사",
    reactions: {},
  });
  commentRecords.set("meal-1:comment-1", {
    authorUid: "user-3",
    text: "숨겨진 댓글",
    reactions: {},
  });

  const [{ toggleStoredCommentReactionForUser }, { RouteError }] = await Promise.all([
    importFresh<typeof import("../lib/modules/reactions/adapters/firestore/reaction-admin-store.ts")>(
      "../lib/modules/reactions/adapters/firestore/reaction-admin-store.ts"
    ),
    importFresh<typeof import("../lib/platform/http/route-errors.ts")>(
      "../lib/platform/http/route-errors.ts"
    ),
  ]);

  await assert.rejects(
    () =>
      toggleStoredCommentReactionForUser({
        mealId: "meal-1",
        commentId: "comment-1",
        uid: "user-2",
        actorRole: "아빠",
        emoji: "🔥",
      }),
    (error: unknown) =>
      error instanceof RouteError &&
      error.status === 403 &&
      error.message === "Not allowed"
  );

  assert.equal(transactionUpdates.length, 0);
  assert.equal(commentActivityCalls.length, 0);
});
