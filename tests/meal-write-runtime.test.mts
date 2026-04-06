import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

type StoredMealRecord = {
  id: string;
  ownerUid?: string;
  userIds?: string[];
  description: string;
  type: string;
  imageUrl?: string;
  timestamp: number;
  commentCount?: number;
  reactions?: Record<string, unknown>;
  keywords?: string[];
};

const DELETE_FIELD = Symbol("delete-field");
const mealRecords = new Map<string, StoredMealRecord>();
const transactionSets: Array<{ mealId: string; payload: Record<string, unknown> }> = [];

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("firebase-admin/firestore", {
  ...mockModuleOptions({
    FieldValue: {
      delete: () => DELETE_FIELD,
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
          doc: (id: string) => ({ id }),
        };
      },
      runTransaction: async (
        handler: (tx: {
          get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => unknown }>;
          set: (ref: { id: string }, payload: Record<string, unknown>) => void;
        }) => Promise<unknown>
      ) =>
        handler({
          get: async (ref) => {
            const record = mealRecords.get(ref.id);
            return {
              exists: Boolean(record),
              data: () =>
                record
                  ? {
                      ownerUid: record.ownerUid,
                      userIds: record.userIds,
                      description: record.description,
                      type: record.type,
                      imageUrl: record.imageUrl,
                      timestamp: { toMillis: () => record.timestamp },
                      commentCount: record.commentCount ?? 0,
                      reactions: record.reactions ?? {},
                      keywords: record.keywords ?? [],
                    }
                  : undefined,
            };
          },
          set: (ref, payload) => {
            transactionSets.push({ mealId: ref.id, payload });
          },
        }),
    },
  }),
});

mock.module("@/lib/modules/meals/server/meal-storage", {
  ...mockModuleOptions({
    deleteStorageObjectByUrl: async () => true,
  }),
});

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logError: () => undefined,
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  mealRecords.clear();
  transactionSets.length = 0;
});

test("updateMealDocument rejects participant updates that remove the actor role", async () => {
  mealRecords.set("meal-1", {
    id: "meal-1",
    ownerUid: "user-1",
    userIds: ["엄마", "아빠"],
    description: "점심 기록",
    type: "점심",
    timestamp: Date.UTC(2026, 3, 4, 12, 0, 0, 0),
    commentCount: 0,
    reactions: {},
    keywords: ["점심", "엄마", "아빠"],
  });

  const { updateMealDocument } = await importFresh<
    typeof import("../lib/modules/meals/server/meal-write-use-cases.ts")
  >("../lib/modules/meals/server/meal-write-use-cases.ts");

  await assert.rejects(
    () =>
      updateMealDocument({
        mealId: "meal-1",
        uid: "user-1",
        actorRole: "엄마",
        input: {
          userIds: ["아빠"],
        },
      }),
    /Meal participants must include your role/
  );

  assert.equal(transactionSets.length, 0);
});
