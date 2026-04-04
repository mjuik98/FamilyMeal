import { normalizeReactionMap } from "@/lib/reactions";
import type { Meal, MealComment } from "@/lib/types";

export const countMealReactions = (meal: Meal): number =>
  Object.values(normalizeReactionMap(meal.reactions)).reduce(
    (sum, users) => sum + (users?.length ?? 0),
    0
  );

export const countCommentReactions = (comments: MealComment[]): number =>
  comments.reduce(
    (sum, comment) =>
      sum +
      Object.values(normalizeReactionMap(comment.reactions)).reduce(
        (inner, users) => inner + (users?.length ?? 0),
        0
      ),
    0
  );

export const getMealCommentCount = (
  meal: Meal,
  commentsByMeal?: Record<string, MealComment[]>
): number =>
  commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? meal.comments?.length ?? 0;
