import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const mealRecords = new Map<
  string,
  {
    ownerUid?: unknown;
    userIds?: unknown;
    userId?: unknown;
    commentCount?: unknown;
  }
>();
const parentCommentRecords = new Map<string, Record<string, unknown>>();
const transactionSets: Array<{ ref: { mealId?: string; id: string }; payload: Record<string, unknown> }> = [];
const transactionUpdates: Array<{ ref: { mealId?: string; id: string }; payload: Record<string, unknown> }> = [];
const activityCalls: unknown[] = [];

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("firebase-admin/firestore", {
  ...mockModuleOptions({
    FieldValue: {
      increment: (value: number) => ({ __increment: value }),
    },
    Timestamp: {
      fromMillis: (value: number) => ({
        toMillis: () => value,
      }),
    },
  }),
});

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
                doc: (commentId = "generated-comment") => ({
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
          set: (ref: { id: string; mealId?: string }, payload: Record<string, unknown>) => void;
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

            const record = parentCommentRecords.get(`${ref.mealId}:${ref.id}`);
            return {
              exists: Boolean(record),
              data: () => record,
            };
          },
          set: (ref, payload) => {
            transactionSets.push({ ref, payload });
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
    createCommentActivities: (payload: unknown) => {
      activityCalls.push(payload);
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  mealRecords.clear();
  parentCommentRecords.clear();
  transactionSets.length = 0;
  transactionUpdates.length = 0;
  activityCalls.length = 0;
});

test("createStoredMealComment rejects meals without a valid family participant", async () => {
  mealRecords.set("meal-1", {
    ownerUid: "owner-1",
    userIds: [],
    commentCount: 0,
  });

  const [{ createStoredMealComment }, { RouteError }] = await Promise.all([
    importFresh<typeof import("../lib/modules/comments/adapters/firestore/comment-admin-store.ts")>(
      "../lib/modules/comments/adapters/firestore/comment-admin-store.ts"
    ),
    importFresh<typeof import("../lib/platform/http/route-errors.ts")>(
      "../lib/platform/http/route-errors.ts"
    ),
  ]);

  await assert.rejects(
    () =>
      createStoredMealComment({
        mealId: "meal-1",
        uid: "user-2",
        actorRole: "아빠",
        text: "유효하지 않은 식사에 댓글 시도",
      }),
    (error: unknown) =>
      error instanceof RouteError &&
      error.status === 403 &&
      error.message === "Not allowed"
  );

  assert.equal(transactionSets.length, 0);
  assert.equal(transactionUpdates.length, 0);
  assert.equal(activityCalls.length, 0);
});
