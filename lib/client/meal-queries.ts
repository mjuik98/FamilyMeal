import { fetchAuthedJson } from "@/lib/client/auth-http";
import { formatDateKey } from "@/lib/date-utils";
import { SEARCH_FALLBACK_LIMIT, SEARCH_INDEX_LIMIT } from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import type { Meal, WeeklyMealStat } from "@/lib/types";

import { dedupeAndSortMeals } from "@/lib/client/serializers";
import type { UserRole } from "@/lib/types";

const MEAL_REFRESH_INTERVAL_MS = 60_000;

const matchesKeyword = (meal: Meal, keyword: string): boolean => {
  const lower = keyword.toLowerCase();
  const participantRoles = meal.userIds?.length ? meal.userIds : meal.userId ? [meal.userId] : [];
  return (
    meal.description.toLowerCase().includes(lower) ||
    meal.type.toLowerCase().includes(lower) ||
    participantRoles.some((role) => role.toLowerCase().includes(lower)) ||
    Boolean(meal.keywords?.some((token) => token.includes(lower)))
  );
};

export const getMealsForDate = async (date: Date): Promise<Meal[]> => {
  const response = await fetchAuthedJson<{ ok: true; meals?: Meal[] }>(
    `/api/meals?date=${encodeURIComponent(formatDateKey(date))}`
  );
  return dedupeAndSortMeals(Array.isArray(response.meals) ? response.meals : []);
};

export const getRecentMeals = async (maxResults = 40): Promise<Meal[]> => {
  const response = await listArchiveMeals({ limit: maxResults });
  return response.meals;
};

export const subscribeMealsForDate = (
  date: Date,
  onMeals: (meals: Meal[]) => void,
  onError?: (error: Error) => void
) => {
  let active = true;
  let requestSequence = 0;

  const loadMeals = async () => {
    const requestId = ++requestSequence;
    try {
      const meals = await getMealsForDate(date);
      if (!active || requestId !== requestSequence) {
        return;
      }
      onMeals(meals);
    } catch (error) {
      if (!active || requestId !== requestSequence) {
        return;
      }
      const nextError = error instanceof Error ? error : new Error("Failed to load meals");
      logError("Failed to subscribe to meals", nextError);
      onError?.(nextError);
    }
  };

  void loadMeals();

  if (typeof window === "undefined") {
    return () => {
      active = false;
      requestSequence += 1;
    };
  }

  const intervalId = window.setInterval(() => {
    void loadMeals();
  }, MEAL_REFRESH_INTERVAL_MS);

  const handleFocus = () => {
    void loadMeals();
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void loadMeals();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    active = false;
    requestSequence += 1;
    window.clearInterval(intervalId);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};

export const getMealById = async (id: string): Promise<Meal | null> => {
  const encodedMealId = encodeURIComponent(id);
  const response = await fetchAuthedJson<{ ok: true; meal: Meal | null }>(
    `/api/meals/${encodedMealId}`
  );
  return response.meal ?? null;
};

export const getWeeklyStats = async (referenceDate: Date = new Date()): Promise<WeeklyMealStat[]> => {
  const response = await fetchAuthedJson<{
    ok: true;
    stats?: Array<{
      date: number;
      label: string;
      count: number;
      previewImageUrl?: string;
    }>;
  }>(`/api/meals/weekly-stats?date=${encodeURIComponent(formatDateKey(referenceDate))}`);

  return Array.isArray(response.stats)
    ? response.stats.map((stat) => ({
        date: new Date(stat.date),
        label: stat.label,
        count: stat.count,
        previewImageUrl: stat.previewImageUrl,
      }))
    : [];
};

export const searchMeals = async (keyword: string): Promise<Meal[]> => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];

  const response = await listArchiveMeals({
    query: normalized,
    limit: Math.max(SEARCH_INDEX_LIMIT, SEARCH_FALLBACK_LIMIT),
  });
  return response.meals.filter((meal) => matchesKeyword(meal, normalized));
};

export const listArchiveMeals = async (options: {
  query?: string;
  type?: Meal["type"] | "전체";
  participant?: UserRole | "전체";
  cursor?: string | null;
  limit?: number;
}): Promise<{ meals: Meal[]; nextCursor: string | null; hasMore: boolean; isPartial: boolean }> => {
  const searchParams = new URLSearchParams();

  if (options.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }
  if (options.type && options.type !== "전체") {
    searchParams.set("type", options.type);
  }
  if (options.participant && options.participant !== "전체") {
    searchParams.set("participant", options.participant);
  }
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.floor(options.limit))));
  }
  if (options.cursor) {
    searchParams.set("cursor", options.cursor);
  }

  const response = await fetchAuthedJson<{
    ok: true;
    meals: Meal[];
    nextCursor?: string | null;
    hasMore?: boolean;
    isPartial?: boolean;
  }>(`/api/archive?${searchParams.toString()}`);

  return {
    meals: Array.isArray(response.meals) ? response.meals : [],
    nextCursor: typeof response.nextCursor === "string" ? response.nextCursor : null,
    hasMore: response.hasMore === true,
    isPartial: response.isPartial === true,
  };
};
