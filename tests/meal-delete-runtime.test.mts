import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const activityDocs: Array<{ id: string; ref: { id: string } }> = [];
const deletedActivityIds: string[] = [];
let batchCommitCount = 0;

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/firebase-admin", {
  ...mockModuleOptions({
    adminDb: {
      collectionGroup: (name: string) => {
        if (name !== "activity") {
          throw new Error(`Unsupported collection group: ${name}`);
        }

        const query = {
          where: () => query,
          orderBy: () => query,
          startAfter: () => query,
          limit: () => query,
          get: async () => ({
            empty: activityDocs.length === 0,
            size: activityDocs.length,
            docs: [...activityDocs],
          }),
        };

        return query;
      },
      batch: () => ({
        delete: (ref: { id: string }) => {
          deletedActivityIds.push(ref.id);
        },
        commit: async () => {
          batchCommitCount += 1;
        },
      }),
      collection: () => ({
        doc: () => ({
          set: async () => undefined,
          delete: async () => undefined,
        }),
      }),
      runTransaction: async () => undefined,
    },
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  activityDocs.length = 0;
  deletedActivityIds.length = 0;
  batchCommitCount = 0;
});

test("deleteMealActivitiesByMealId removes orphaned activity records for the meal", async () => {
  activityDocs.push(
    { id: "meal-comment:comment-1:user-1", ref: { id: "meal-comment:comment-1:user-1" } },
    { id: "comment-reaction:comment-2:❤️:user-2:user-3", ref: { id: "comment-reaction:comment-2:❤️:user-2:user-3" } }
  );

  const { deleteMealActivitiesByMealId } = await importFresh<
    typeof import("../lib/modules/meals/server/meal-delete-use-cases.ts")
  >("../lib/modules/meals/server/meal-delete-use-cases.ts");

  await deleteMealActivitiesByMealId("meal-1");

  assert.deepEqual(deletedActivityIds, activityDocs.map((doc) => doc.id));
  assert.equal(batchCommitCount, 1);
});
