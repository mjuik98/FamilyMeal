import { normalizeReactionMap } from "@/lib/reactions";
import type { Meal, MealComment, UserRole } from "@/lib/types";

export type MealSortOrder = "recent" | "comments" | "reactions" | "activity";

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

const getMealCommentsSnapshot = (
  meal: Meal,
  commentsByMeal?: Record<string, MealComment[]>
): MealComment[] => commentsByMeal?.[meal.id] ?? meal.comments ?? [];

export const getMealCommentCount = (
  meal: Meal,
  commentsByMeal?: Record<string, MealComment[]>
): number =>
  commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? meal.comments?.length ?? 0;

type DerivedMealMetrics = {
  meal: Meal;
  commentCount: number;
  reactionCount: number;
  engagementCount: number;
};

const deriveMealMetrics = (
  meal: Meal,
  commentsByMeal?: Record<string, MealComment[]>
): DerivedMealMetrics => {
  const comments = getMealCommentsSnapshot(meal, commentsByMeal);
  const reactionCount = countMealReactions(meal);
  const commentCount =
    commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? comments.length;

  return {
    meal,
    commentCount,
    reactionCount,
    engagementCount: reactionCount + countCommentReactions(comments),
  };
};

export const filterAndSortMeals = (
  meals: Meal[],
  options: {
    query?: string;
    type?: Meal["type"] | "전체";
    participant?: UserRole | "전체";
    sort?: MealSortOrder;
    ownerUid?: string;
    mineOnly?: boolean;
    engagedOnly?: boolean;
    minimumComments?: number;
    minimumReactions?: number;
    commentsByMeal?: Record<string, MealComment[]>;
  }
): Meal[] => {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
  const derivedMeals = meals.map((meal) =>
    deriveMealMetrics(meal, options.commentsByMeal)
  );
  const filtered = derivedMeals.filter((entry) => {
    const { meal } = entry;
    const matchesQuery =
      !normalizedQuery ||
      meal.description.toLowerCase().includes(normalizedQuery) ||
      meal.type.toLowerCase().includes(normalizedQuery) ||
      Boolean(
        meal.userIds?.some((uid) => uid.toLowerCase().includes(normalizedQuery))
      );

    const matchesType =
      !options.type || options.type === "전체" || meal.type === options.type;
    const matchesParticipant =
      !options.participant ||
      options.participant === "전체" ||
      Boolean(meal.userIds?.includes(options.participant));
    const matchesMineOnly =
      !options.mineOnly ||
      (Boolean(options.ownerUid) && meal.ownerUid === options.ownerUid);
    const minimumComments = options.minimumComments ?? 0;
    const minimumReactions = options.minimumReactions ?? 0;
    const matchesCommentThreshold =
      minimumComments <= 0 || entry.commentCount >= minimumComments;
    const matchesEngagedOnly = !options.engagedOnly || entry.engagementCount > 0;
    const matchesReactionThreshold =
      minimumReactions <= 0 || entry.engagementCount >= minimumReactions;

    return (
      matchesQuery &&
      matchesType &&
      matchesParticipant &&
      matchesMineOnly &&
      matchesCommentThreshold &&
      matchesEngagedOnly &&
      matchesReactionThreshold
    );
  });

  const sorted = [...filtered];
  const sort = options.sort ?? "recent";
  sorted.sort((a, b) => {
    if (sort === "comments") {
      return b.commentCount - a.commentCount || b.meal.timestamp - a.meal.timestamp;
    }
    if (sort === "reactions") {
      return (
        b.reactionCount - a.reactionCount || b.meal.timestamp - a.meal.timestamp
      );
    }
    if (sort === "activity") {
      return (
        b.engagementCount - a.engagementCount ||
        b.meal.timestamp - a.meal.timestamp
      );
    }
    return b.meal.timestamp - a.meal.timestamp;
  });

  return sorted.map((entry) => entry.meal);
};
