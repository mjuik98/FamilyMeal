import {
  isReactionEmoji,
  normalizeReactionMap,
} from "@/lib/modules/reactions/domain/reaction-map";
import { fetchAuthedJson } from "@/lib/platform/http/auth-http";
import type { Meal, MealComment } from "@/lib/types";

export const toggleMealReaction = async (mealId: string, emoji: string) => {
  if (!isReactionEmoji(emoji)) {
    throw new Error("Invalid reaction emoji");
  }

  const encodedMealId = encodeURIComponent(mealId);
  const response = await fetchAuthedJson<{ ok: true; reactions: Meal["reactions"] }>(
    `/api/meals/${encodedMealId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
  return normalizeReactionMap(response.reactions);
};

export const toggleMealCommentReaction = async (
  mealId: string,
  commentId: string,
  emoji: string
) => {
  if (!isReactionEmoji(emoji)) {
    throw new Error("Invalid reaction emoji");
  }

  const encodedMealId = encodeURIComponent(mealId);
  const encodedCommentId = encodeURIComponent(commentId);
  const response = await fetchAuthedJson<{ ok: true; reactions: MealComment["reactions"] }>(
    `/api/meals/${encodedMealId}/comments/${encodedCommentId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  );
  return normalizeReactionMap(response.reactions);
};
