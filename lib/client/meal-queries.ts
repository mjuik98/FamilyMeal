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
  SEARCH_FALLBACK_LIMIT,
  SEARCH_INDEX_LIMIT,
} from "@/lib/domain/meal-policy";
import type { Meal, WeeklyMealStat } from "@/lib/types";

import {
  convertMeal,
  dedupeAndSortMeals,
  serializeMealSnapshot,
  serializeWeeklyStatMealSnapshot,
} from "@/lib/client/serializers";

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

export const getMealById = async (id: string): Promise<Meal | null> => {
  const mealRef = doc(db, "meals", id);
  const snapshot = await getDoc(mealRef);
  if (!snapshot.exists()) return null;

  return serializeMealSnapshot(snapshot.id, snapshot.data());
};

export const getWeeklyStats = async (
  referenceDate: Date = new Date()
): Promise<WeeklyMealStat[]> => {
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
        return indexedMeals
          .filter((meal) => matchesKeyword(meal, normalized))
          .sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch (error) {
    console.warn("Indexed search failed, falling back to full scan", error);
  }

  const fallbackQuery = query(
    mealsRef,
    orderBy("timestamp", "desc"),
    limit(SEARCH_FALLBACK_LIMIT)
  );
  const fallbackSnapshot = await getDocs(fallbackQuery);
  return fallbackSnapshot.docs
    .map(convertMeal)
    .filter((meal) => matchesKeyword(meal, normalized));
};
