import type { ReactionEmoji, ReactionMap } from "@/lib/types";
import {
  toggleCommentReactionInRuntime,
  toggleMealReactionInRuntime,
} from "@/lib/modules/reactions/infrastructure/reaction-runtime";

export const toggleMealReactionForViewer = async ({
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
  return toggleMealReactionInRuntime({
    mealId,
    emoji,
    userUid,
    currentReactions,
  });
};

export const toggleCommentReactionForViewer = async ({
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
  return toggleCommentReactionInRuntime({
    mealId,
    commentId,
    emoji,
    userUid,
    currentReactions,
  });
};
