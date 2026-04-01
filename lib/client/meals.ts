import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  MAX_MEAL_DESCRIPTION_LENGTH,
  SEARCH_FALLBACK_LIMIT,
  SEARCH_INDEX_LIMIT,
} from "@/lib/domain/meal-policy";
import { normalizeReactionMap } from "@/lib/reactions";
import type { Meal, MealComment, UserRole, WeeklyMealStat } from "@/lib/types";

import { fetchAuthedJson } from "@/lib/client/auth-http";
import { convertMeal, dedupeAndSortMeals, serializeMealSnapshot, serializeWeeklyStatMealSnapshot } from "@/lib/client/serializers";

export type MealUpdateInput = Partial<Omit<Meal, "id" | "imageUrl">> & {
  imageUrl?: string | null;
};

export type MealSortOrder = "recent" | "comments" | "reactions" | "activity";

const getDayRange = (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

const getDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeMealDescription = (description: string): string => {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Meal description is empty");
  }
  if (trimmed.length > MAX_MEAL_DESCRIPTION_LENGTH) {
    throw new Error(`Meal description must be <= ${MAX_MEAL_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
};

const matchesKeyword = (meal: Meal, keyword: string): boolean => {
  const lower = keyword.toLowerCase();
  return (
    meal.description.toLowerCase().includes(lower) ||
    meal.type.toLowerCase().includes(lower) ||
    Boolean(meal.userIds?.some((u) => u.toLowerCase().includes(lower))) ||
    Boolean(meal.keywords?.some((k) => k.includes(lower)))
  );
};

export const getMealsForDate = async (date: Date): Promise<Meal[]> => {
  const { startOfDay, endOfDay } = getDayRange(date);
  const mealsRef = collection(db, "meals");
  const q = query(
    mealsRef,
    where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
    where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(q);
  return dedupeAndSortMeals(snapshot.docs.map(convertMeal));
};

export const getRecentMeals = async (maxResults = 40): Promise<Meal[]> => {
  const mealsRef = collection(db, "meals");
  const q = query(mealsRef, orderBy("timestamp", "desc"), limit(maxResults));
  const snapshot = await getDocs(q);
  return dedupeAndSortMeals(snapshot.docs.map(convertMeal));
};

export const subscribeMealsForDate = (
  date: Date,
  onMeals: (meals: Meal[]) => void,
  onError?: (error: Error) => void
) => {
  const { startOfDay, endOfDay } = getDayRange(date);
  const mealsRef = collection(db, "meals");
  const q = query(
    mealsRef,
    where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
    where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onMeals(dedupeAndSortMeals(snapshot.docs.map(convertMeal)));
    },
    (error) => {
      console.error("Failed to subscribe to meals", error);
      onError?.(error);
    }
  );
};

export const addMeal = async (meal: Omit<Meal, "id">): Promise<Meal> => {
  if (!meal.ownerUid) {
    throw new Error("ownerUid is required");
  }

  const response = await fetchAuthedJson<{ ok: true; meal: Meal }>("/api/meals", {
    method: "POST",
    body: JSON.stringify({
      userIds: meal.userIds,
      description: normalizeMealDescription(meal.description),
      type: meal.type,
      imageUrl: meal.imageUrl,
      timestamp: meal.timestamp,
    }),
  });

  return response.meal;
};

export const getMealById = async (id: string): Promise<Meal | null> => {
  const mealRef = doc(db, "meals", id);
  const snapshot = await getDoc(mealRef);
  if (!snapshot.exists()) return null;

  return serializeMealSnapshot(snapshot.id, snapshot.data());
};

export const updateMeal = async (id: string, updates: MealUpdateInput): Promise<Meal> => {
  const nextUpdates = { ...updates };
  if (typeof nextUpdates.description === "string") {
    nextUpdates.description = normalizeMealDescription(nextUpdates.description);
  }
  delete (nextUpdates as { comments?: unknown }).comments;
  delete (nextUpdates as { commentCount?: unknown }).commentCount;
  delete (nextUpdates as { reactions?: unknown }).reactions;
  delete (nextUpdates as { timestamp?: unknown }).timestamp;
  delete (nextUpdates as { userId?: unknown }).userId;

  const encodedMealId = encodeURIComponent(id);
  const response = await fetchAuthedJson<{ ok: true; meal: Meal }>(`/api/meals/${encodedMealId}`, {
    method: "PATCH",
    body: JSON.stringify(nextUpdates),
  });

  return response.meal;
};

export const deleteMeal = async (id: string) => {
  const mealId = encodeURIComponent(id);
  await fetchAuthedJson<{ ok: true; deleted: boolean; status: string }>(`/api/meals/${mealId}`, {
    method: "DELETE",
  });
};

export const getWeeklyStats = async (referenceDate: Date = new Date()): Promise<WeeklyMealStat[]> => {
  const now = new Date(referenceDate);
  now.setHours(12, 0, 0, 0);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const dates = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + idx);
    return date;
  });

  const firstRange = getDayRange(dates[0]);
  const lastRange = getDayRange(dates[dates.length - 1]);
  const mealsRef = collection(db, "meals");
  const q = query(
    mealsRef,
    where("timestamp", ">=", Timestamp.fromDate(firstRange.startOfDay)),
    where("timestamp", "<=", Timestamp.fromDate(lastRange.endOfDay)),
    orderBy("timestamp", "desc")
  );
  const snapshot = await getDocs(q);

  const countByDay = new Map<string, number>();
  const previewByDay = new Map<string, string>();
  dates.forEach((date) => countByDay.set(getDayKey(date), 0));

  snapshot.docs.forEach((docSnap) => {
    const meal = serializeWeeklyStatMealSnapshot(docSnap);
    const key = getDayKey(new Date(meal.timestamp));
    if (!countByDay.has(key)) return;
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    if (!previewByDay.has(key) && meal.imageUrl) {
      previewByDay.set(key, meal.imageUrl);
    }
  });

  return dates.map((date) => {
    const key = getDayKey(date);
    return {
      date,
      label: dayNames[date.getDay()],
      count: countByDay.get(key) ?? 0,
      previewImageUrl: previewByDay.get(key),
    };
  });
};

export const countMealReactions = (meal: Meal): number =>
  Object.values(normalizeReactionMap(meal.reactions)).reduce((sum, users) => sum + (users?.length ?? 0), 0);

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

const getMealCommentsSnapshot = (meal: Meal, commentsByMeal?: Record<string, MealComment[]>): MealComment[] =>
  commentsByMeal?.[meal.id] ?? meal.comments ?? [];

export const getMealCommentCount = (meal: Meal, commentsByMeal?: Record<string, MealComment[]>): number =>
  commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? meal.comments?.length ?? 0;

type DerivedMealMetrics = {
  meal: Meal;
  commentCount: number;
  reactionCount: number;
  engagementCount: number;
};

const deriveMealMetrics = (meal: Meal, commentsByMeal?: Record<string, MealComment[]>): DerivedMealMetrics => {
  const comments = getMealCommentsSnapshot(meal, commentsByMeal);
  const reactionCount = countMealReactions(meal);
  const commentCount = commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? comments.length;

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
  const derivedMeals = meals.map((meal) => deriveMealMetrics(meal, options.commentsByMeal));
  const filtered = derivedMeals.filter((entry) => {
    const { meal } = entry;
    const matchesQuery =
      !normalizedQuery ||
      meal.description.toLowerCase().includes(normalizedQuery) ||
      meal.type.toLowerCase().includes(normalizedQuery) ||
      Boolean(meal.userIds?.some((uid) => uid.toLowerCase().includes(normalizedQuery)));

    const matchesType = !options.type || options.type === "전체" || meal.type === options.type;
    const matchesParticipant =
      !options.participant || options.participant === "전체" || Boolean(meal.userIds?.includes(options.participant));
    const matchesMineOnly = !options.mineOnly || (Boolean(options.ownerUid) && meal.ownerUid === options.ownerUid);
    const minimumComments = options.minimumComments ?? 0;
    const minimumReactions = options.minimumReactions ?? 0;
    const matchesCommentThreshold = minimumComments <= 0 || entry.commentCount >= minimumComments;
    const matchesEngagedOnly = !options.engagedOnly || entry.engagementCount > 0;
    const matchesReactionThreshold = minimumReactions <= 0 || entry.engagementCount >= minimumReactions;

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
      return b.reactionCount - a.reactionCount || b.meal.timestamp - a.meal.timestamp;
    }
    if (sort === "activity") {
      return b.engagementCount - a.engagementCount || b.meal.timestamp - a.meal.timestamp;
    }
    return b.meal.timestamp - a.meal.timestamp;
  });

  return sorted.map((entry) => entry.meal);
};

export const searchMeals = async (keyword: string): Promise<Meal[]> => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];

  const mealsRef = collection(db, "meals");
  const searchTokens = Array.from(
    new Set(
      normalized
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  ).slice(0, 10);

  try {
    if (searchTokens.length > 0) {
      const indexedQuery = query(
        mealsRef,
        where("keywords", "array-contains-any", searchTokens),
        limit(SEARCH_INDEX_LIMIT)
      );
      const indexedSnapshot = await getDocs(indexedQuery);
      const indexedMeals = indexedSnapshot.docs.map(convertMeal);
      if (indexedMeals.length > 0) {
        return indexedMeals.filter((meal) => matchesKeyword(meal, normalized)).sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch (error) {
    console.warn("Indexed search failed, falling back to full scan", error);
  }

  const fallbackQuery = query(mealsRef, orderBy("timestamp", "desc"), limit(SEARCH_FALLBACK_LIMIT));
  const fallbackSnapshot = await getDocs(fallbackQuery);
  return fallbackSnapshot.docs.map(convertMeal).filter((meal) => matchesKeyword(meal, normalized));
};
