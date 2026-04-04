import {
  toggleMealCommentReaction,
  toggleMealReaction,
} from "@/lib/client/reactions";
import { toggleReactionInMap } from "@/lib/reactions";
import { isQaRuntimeActive } from "@/lib/qa/runtime";
import type { ReactionEmoji, ReactionMap } from "@/lib/types";

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
  if (isQaRuntimeActive()) {
    return toggleReactionInMap(currentReactions, emoji, userUid);
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
  if (isQaRuntimeActive()) {
    return toggleReactionInMap(currentReactions, emoji, userUid);
  }

  return toggleMealCommentReaction(mealId, commentId, emoji);
};
