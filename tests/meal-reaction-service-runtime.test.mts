import assert from "node:assert/strict";
import { mock, test } from "node:test";

import type { ReactionMap } from "../lib/types";

let qaMode = false;

const remoteMealReactions: ReactionMap = {
  "❤️": ["user-1"],
};

const remoteCommentReactions: ReactionMap = {
  "🔥": ["user-1"],
};

const callLog = {
  mealCalls: 0,
  commentCalls: 0,
};

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/client/reactions", {
  ...mockModuleOptions({
    toggleMealReaction: async () => {
      callLog.mealCalls += 1;
      return remoteMealReactions;
    },
    toggleMealCommentReaction: async () => {
      callLog.commentCalls += 1;
      return remoteCommentReactions;
    },
  }),
});

mock.module("@/lib/qa/adapters/reactions", {
  ...mockModuleOptions({
    isQaReactionRuntimeActive: () => qaMode,
    toggleQaMealReaction: async ({
      emoji,
      userUid,
      currentReactions,
    }: {
      emoji: keyof ReactionMap;
      userUid: string;
      currentReactions: ReactionMap;
    }) => ({
      ...currentReactions,
      [emoji]: [...(currentReactions[emoji] ?? []), userUid],
    }),
    toggleQaCommentReaction: async ({
      emoji,
      userUid,
      currentReactions,
    }: {
      emoji: keyof ReactionMap;
      userUid: string;
      currentReactions: ReactionMap;
    }) => ({
      ...currentReactions,
      [emoji]: [...(currentReactions[emoji] ?? []), userUid],
    }),
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("reaction service delegates to remote adapters outside QA mode", async () => {
  const service = await importFresh<typeof import("../lib/features/reactions/application/meal-reaction-service.ts")>(
    "../lib/features/reactions/application/meal-reaction-service.ts"
  );

  const mealReactions = await service.toggleMealReactionForViewer({
    mealId: "meal-1",
    emoji: "❤️",
    userUid: "user-1",
    currentReactions: {},
  });
  const commentReactions = await service.toggleCommentReactionForViewer({
    mealId: "meal-1",
    commentId: "comment-1",
    emoji: "🔥",
    userUid: "user-1",
    currentReactions: {},
  });

  assert.deepEqual(mealReactions, remoteMealReactions);
  assert.deepEqual(commentReactions, remoteCommentReactions);
  assert.equal(callLog.mealCalls, 1);
  assert.equal(callLog.commentCalls, 1);
});

test("reaction service applies local QA toggles without remote adapters", async () => {
  qaMode = true;
  const service = await importFresh<typeof import("../lib/features/reactions/application/meal-reaction-service.ts")>(
    "../lib/features/reactions/application/meal-reaction-service.ts"
  );

  const mealReactions = await service.toggleMealReactionForViewer({
    mealId: "meal-1",
    emoji: "❤️",
    userUid: "user-1",
    currentReactions: {},
  });
  const commentReactions = await service.toggleCommentReactionForViewer({
    mealId: "meal-1",
    commentId: "comment-1",
    emoji: "🔥",
    userUid: "user-1",
    currentReactions: {},
  });

  assert.deepEqual(mealReactions, { "❤️": ["user-1"] });
  assert.deepEqual(commentReactions, { "🔥": ["user-1"] });
  assert.equal(callLog.mealCalls, 1);
  assert.equal(callLog.commentCalls, 1);
  qaMode = false;
});
