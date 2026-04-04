import { Timestamp } from "firebase-admin/firestore";

import {
  formatDateKey,
  getAppDayOfWeek,
  getDayRangeForDate,
  getWeekDatesForDate,
} from "@/lib/date-utils";
import { adminDb } from "@/lib/firebase-admin";
import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";

import {
  serializeMealDocument,
  type StoredMealDoc,
} from "@/lib/server/meals/meal-types";

const isMealVisibleToRole = (meal: Meal, actorRole: UserRole): boolean =>
  (Array.isArray(meal.userIds) && meal.userIds.includes(actorRole)) ||
  meal.userId === actorRole;

export const getMealByIdForActor = async ({
  mealId,
  actorRole,
}: {
  mealId: string;
  actorRole: UserRole;
}): Promise<Meal | null> => {
  const mealSnap = await adminDb.collection("meals").doc(mealId).get();
  if (!mealSnap.exists) {
    return null;
  }

  const meal = serializeMealDocument(mealId, mealSnap.data() as StoredMealDoc);
  return isMealVisibleToRole(meal, actorRole) ? meal : null;
};

export const listMealsForDate = async ({
  actorRole,
  date,
}: {
  actorRole: UserRole;
  date: Date;
}): Promise<Meal[]> => {
  const { startOfDay, endOfDay } = getDayRangeForDate(date);
  const snapshot = await adminDb
    .collection("meals")
    .where("timestamp", ">=", Timestamp.fromDate(startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(endOfDay))
    .orderBy("timestamp", "desc")
    .get();

  return snapshot.docs
    .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) =>
      serializeMealDocument(docSnap.id, docSnap.data() as StoredMealDoc)
    )
    .filter((meal) => isMealVisibleToRole(meal, actorRole));
};

export const listWeeklyMealStats = async ({
  actorRole,
  referenceDate,
}: {
  actorRole: UserRole;
  referenceDate: Date;
}): Promise<WeeklyMealStat[]> => {
  const dates = getWeekDatesForDate(referenceDate);
  const firstRange = getDayRangeForDate(dates[0] ?? referenceDate);
  const lastRange = getDayRangeForDate(dates[dates.length - 1] ?? referenceDate);
  const snapshot = await adminDb
    .collection("meals")
    .where("timestamp", ">=", Timestamp.fromDate(firstRange.startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(lastRange.endOfDay))
    .orderBy("timestamp", "desc")
    .get();

  const countByDay = new Map<string, number>();
  const previewByDay = new Map<string, string>();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  dates.forEach((date) => countByDay.set(formatDateKey(date), 0));

  snapshot.docs
    .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) =>
      serializeMealDocument(docSnap.id, docSnap.data() as StoredMealDoc)
    )
    .filter((meal) => isMealVisibleToRole(meal, actorRole))
    .forEach((meal) => {
      const key = formatDateKey(new Date(meal.timestamp));
      if (!countByDay.has(key)) {
        return;
      }

      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
      if (!previewByDay.has(key) && meal.imageUrl) {
        previewByDay.set(key, meal.imageUrl);
      }
    });

  return dates.map((date) => {
    const key = formatDateKey(date);
    return {
      date,
      label: dayNames[getAppDayOfWeek(date)] ?? "",
      count: countByDay.get(key) ?? 0,
      previewImageUrl: previewByDay.get(key),
    };
  });
};
