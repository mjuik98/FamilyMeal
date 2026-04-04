import assert from "node:assert/strict";
import { mock, test } from "node:test";

import type { MealComment } from "../lib/types";

const TEST_NOW = Date.UTC(2026, 3, 4, 12, 0, 0, 0);

let qaMode = false;

const fallbackComments: MealComment[] = [
  {
    id: "fallback-comment",
    author: "엄마",
    authorUid: "user-1",
    text: "fallback",
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    timestamp: TEST_NOW,
    reactions: {},
  },
];

const remoteComments: MealComment[] = [
  {
    id: "remote-comment",
    author: "엄마",
    authorUid: "user-1",
    text: "remote",
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    timestamp: TEST_NOW,
    reactions: {},
  },
];

const callLog = {
  subscribeCalls: 0,
  createCalls: 0,
  updateCalls: 0,
  deleteCalls: 0,
};

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/client/comments", {
  ...mockModuleOptions({
    addMealComment: async () => {
      callLog.createCalls += 1;
      return remoteComments[0];
    },
    updateMealComment: async () => {
      callLog.updateCalls += 1;
      return {
        ...remoteComments[0],
        text: "updated remote",
        updatedAt: TEST_NOW + 1_000,
        timestamp: TEST_NOW + 1_000,
      };
    },
    deleteMealComment: async () => {
      callLog.deleteCalls += 1;
    },
  }),
});

mock.module("@/lib/meal-comments-store", {
  ...mockModuleOptions({
    subscribeToMealComments: (
      _mealId: string,
      _options: unknown,
      onComments: (comments: MealComment[]) => void
    ) => {
      callLog.subscribeCalls += 1;
      onComments(remoteComments);
      return () => undefined;
    },
  }),
});

mock.module("@/lib/qa/runtime", {
  ...mockModuleOptions({
    isQaRuntimeActive: () => qaMode,
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("watchMealCommentsForViewer uses fallback comments in QA mode without remote subscription", async () => {
  qaMode = true;
  const service = await importFresh<typeof import("../lib/features/comments/application/meal-comment-service.ts")>(
    "../lib/features/comments/application/meal-comment-service.ts"
  );

  const seen: MealComment[][] = [];
  service.watchMealCommentsForViewer({
    mealId: "meal-1",
    fallbackComments,
    onComments: (comments) => {
      seen.push(comments);
    },
  });

  assert.deepEqual(seen, [fallbackComments]);
  assert.equal(callLog.subscribeCalls, 0);
  qaMode = false;
});

test("comment service delegates remote create update and delete outside QA mode", async () => {
  const service = await importFresh<typeof import("../lib/features/comments/application/meal-comment-service.ts")>(
    "../lib/features/comments/application/meal-comment-service.ts"
  );

  const created = await service.createMealCommentForViewer({
    mealId: "meal-1",
    authorRole: "엄마",
    authorUid: "user-1",
    text: "remote",
  });
  const updated = await service.updateMealCommentForViewer({
    mealId: "meal-1",
    commentId: created.id,
    actorUid: "user-1",
    text: "updated remote",
    existingComment: created,
  });
  await service.deleteMealCommentForViewer({
    mealId: "meal-1",
    commentId: created.id,
    actorUid: "user-1",
  });

  assert.equal(created.id, "remote-comment");
  assert.equal(updated.text, "updated remote");
  assert.equal(callLog.createCalls, 1);
  assert.equal(callLog.updateCalls, 1);
  assert.equal(callLog.deleteCalls, 1);
});

test("comment service synthesizes QA comment mutations without remote adapters", async () => {
  qaMode = true;
  const service = await importFresh<typeof import("../lib/features/comments/application/meal-comment-service.ts")>(
    "../lib/features/comments/application/meal-comment-service.ts"
  );

  const created = await service.createMealCommentForViewer({
    mealId: "meal-1",
    authorRole: "엄마",
    authorUid: "user-1",
    text: "qa comment",
    parentId: "parent-1",
    mentionedAuthor: "아빠",
  });
  const updated = await service.updateMealCommentForViewer({
    mealId: "meal-1",
    commentId: created.id,
    actorUid: "user-1",
    text: "qa updated",
    existingComment: created,
  });
  await service.deleteMealCommentForViewer({
    mealId: "meal-1",
    commentId: created.id,
    actorUid: "user-1",
  });

  assert.match(created.id, /^qa-comment-/);
  assert.equal(created.parentId, "parent-1");
  assert.equal(created.mentionedAuthor, "아빠");
  assert.equal(updated.text, "qa updated");
  assert.equal(callLog.createCalls, 1);
  assert.equal(callLog.updateCalls, 1);
  assert.equal(callLog.deleteCalls, 1);
  qaMode = false;
});
