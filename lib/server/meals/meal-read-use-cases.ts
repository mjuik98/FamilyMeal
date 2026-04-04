import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";

import {
  serializeMealDocument,
  type StoredMealDoc,
} from "@/lib/server/meals/meal-types";

const isMealVisibleToRole = (meal: Meal, actorRole: UserRole): boolean =>
  Array.isArray(meal.userIds) && meal.userIds.includes(actorRole);

const getDayRange = (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

const getWeekDates = (referenceDate: Date): Date[] => {
  const base = new Date(referenceDate);
  base.setHours(12, 0, 0, 0);

  const startOfWeek = new Date(base);
  startOfWeek.setDate(base.getDate() - base.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(startOfWeek);
    next.setDate(startOfWeek.getDate() + index);
    return next;
  });
};

const getDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const listMealsForDate = async ({
  actorRole,
  date,
}: {
  actorRole: UserRole;
  date: Date;
}): Promise<Meal[]> => {
  const { startOfDay, endOfDay } = getDayRange(date);
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
  const dates = getWeekDates(referenceDate);
  const firstRange = getDayRange(dates[0] ?? referenceDate);
  const lastRange = getDayRange(dates[dates.length - 1] ?? referenceDate);
  const snapshot = await adminDb
    .collection("meals")
    .where("timestamp", ">=", Timestamp.fromDate(firstRange.startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(lastRange.endOfDay))
    .orderBy("timestamp", "desc")
    .get();

  const countByDay = new Map<string, number>();
  const previewByDay = new Map<string, string>();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  dates.forEach((date) => countByDay.set(getDateKey(date), 0));

  snapshot.docs
    .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) =>
      serializeMealDocument(docSnap.id, docSnap.data() as StoredMealDoc)
    )
    .filter((meal) => isMealVisibleToRole(meal, actorRole))
    .forEach((meal) => {
      const key = getDateKey(new Date(meal.timestamp));
      if (!countByDay.has(key)) {
        return;
      }

      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
      if (!previewByDay.has(key) && meal.imageUrl) {
        previewByDay.set(key, meal.imageUrl);
      }
    });

  return dates.map((date) => {
    const key = getDateKey(date);
    return {
      date,
      label: dayNames[date.getDay()] ?? "",
      count: countByDay.get(key) ?? 0,
      previewImageUrl: previewByDay.get(key),
    };
  });
};
