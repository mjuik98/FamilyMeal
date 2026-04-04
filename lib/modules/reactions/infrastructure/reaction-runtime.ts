import {
  toggleMealCommentReaction,
  toggleMealReaction,
} from "@/lib/client/reactions";
import type { ReactionEmoji, ReactionMap } from "@/lib/types";
import {
  isQaReactionRuntimeActive,
  toggleQaCommentReaction,
  toggleQaMealReaction,
} from "@/lib/qa/adapters/reactions";

export const toggleMealReactionInRuntime = async ({
  mealId,
  emoji,
  userUid,
  currentReactions,
}: {
  mealId: string;
  emoji: ReactionEmoji;
  userUid: string;
  currentReactions: ReactionMap;
}): Promise<ReactionMap> => {
  if (isQaReactionRuntimeActive()) {
    return toggleQaMealReaction({
      mealId,
      emoji,
      userUid,
      currentReactions,
    });
  }

  return toggleMealReaction(mealId, emoji);
};

export const toggleCommentReactionInRuntime = async ({
  mealId,
  commentId,
  emoji,
  userUid,
  currentReactions,
}: {
  mealId: string;
  commentId: string;
  emoji: ReactionEmoji;
  userUid: string;
  currentReactions: ReactionMap;
}): Promise<ReactionMap> => {
  if (isQaReactionRuntimeActive()) {
    return toggleQaCommentReaction({
      mealId,
      commentId,
      emoji,
      userUid,
      currentReactions,
    });
  }

  return toggleMealCommentReaction(mealId, commentId, emoji);
};
