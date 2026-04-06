import {
  formatDateKey,
  getAppDayOfWeek,
  getDayRangeForDate,
  getWeekDatesForDate,
} from "@/lib/date-utils";
import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";

import {
  getStoredMealRecordById,
  listStoredMealRecordsInRange,
} from "@/lib/modules/meals/adapters/firestore/meal-admin-store";
import {
  serializeMealDocument,
  type StoredMealDoc,
} from "@/lib/modules/meals/server/meal-types";
import { isMealVisibleToRole } from "@/lib/modules/meals/server/meal-visibility";

export const getMealByIdForActor = async ({
  mealId,
  actorRole,
}: {
  mealId: string;
  actorRole: UserRole;
}): Promise<Meal | null> => {
  const mealRecord = await getStoredMealRecordById(mealId);
  if (!mealRecord) {
    return null;
  }

  const meal = serializeMealDocument(mealRecord.id, mealRecord.data as StoredMealDoc);
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
  const mealRecords = await listStoredMealRecordsInRange({
    start: startOfDay,
    end: endOfDay,
  });

  return mealRecords
    .map((mealRecord) => serializeMealDocument(mealRecord.id, mealRecord.data as StoredMealDoc))
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
  const mealRecords = await listStoredMealRecordsInRange({
    start: firstRange.startOfDay,
    end: lastRange.endOfDay,
  });

  const countByDay = new Map<string, number>();
  const previewByDay = new Map<string, string>();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  dates.forEach((date) => countByDay.set(formatDateKey(date), 0));

  mealRecords
    .map((mealRecord) => serializeMealDocument(mealRecord.id, mealRecord.data as StoredMealDoc))
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
