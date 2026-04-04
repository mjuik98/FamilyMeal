import { toggleReactionInMap } from "@/lib/reactions";
import type { ReactionEmoji, ReactionMap } from "@/lib/types";

import { isQaMockMode } from "@/lib/qa/mode";

export const isQaReactionRuntimeActive = (): boolean => isQaMockMode();

export const toggleQaMealReaction = async ({
  emoji,
  userUid,
  currentReactions,
}: {
  mealId: string;
  emoji: ReactionEmoji;
  userUid: string;
  currentReactions: ReactionMap;
}): Promise<ReactionMap> =>
  toggleReactionInMap(currentReactions, emoji, userUid);

export const toggleQaCommentReaction = async ({
  emoji,
  userUid,
  currentReactions,
}: {
  mealId: string;
  commentId: string;
  emoji: ReactionEmoji;
  userUid: string;
  currentReactions: ReactionMap;
}): Promise<ReactionMap> =>
  toggleReactionInMap(currentReactions, emoji, userUid);
