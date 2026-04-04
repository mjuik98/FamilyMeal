import {
  getMealById,
  getMealsForDate,
  getWeeklyStats,
  listArchiveMeals,
  subscribeMealsForDate,
} from "@/lib/client/meals";
import {
  getQaArchiveMeals,
  getQaMealDetail,
  getQaMealsForDate,
  getQaSameDayMeals,
  getQaWeeklyStats,
  isQaRuntimeActive,
} from "@/lib/qa/runtime";
import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";

export type MealRuntimeState = {
  qaMode: boolean;
  qaAnchorDate: Date;
};

type ArchiveMealFilters = {
  query: string;
  type: Meal["type"] | "전체";
  participant: UserRole | "전체";
  cursor?: string | null;
  limit?: number;
};

const getQaAnchorDate = (referenceDate: Date, anchorHour: number): Date => {
  const anchor = new Date(referenceDate);
  anchor.setHours(anchorHour, 0, 0, 0);
  anchor.setDate(anchor.getDate() + (6 - anchor.getDay()));
  return anchor;
};

export const createMealRuntimeState = ({
  referenceDate = new Date(),
  anchorHour = 12,
}: {
  referenceDate?: Date;
  anchorHour?: number;
} = {}): MealRuntimeState => ({
  qaMode: isQaRuntimeActive(),
  qaAnchorDate: getQaAnchorDate(referenceDate, anchorHour),
});

export const watchMealsForViewerDate = ({
  date,
  role,
  runtimeState,
  onMeals,
  onError,
}: {
  date: Date;
  role?: UserRole | null;
  runtimeState: MealRuntimeState;
  onMeals: (meals: Meal[]) => void;
  onError?: (error: Error) => void;
}) => {
  if (!role) {
    onMeals([]);
    return () => undefined;
  }

  if (runtimeState.qaMode) {
    onMeals(getQaMealsForDate(role, date, runtimeState.qaAnchorDate));
    return () => undefined;
  }

  return subscribeMealsForDate(date, onMeals, onError);
};

export const loadWeeklyStatsForViewer = async ({
  role,
  date,
  runtimeState,
}: {
  role?: UserRole | null;
  date: Date;
  runtimeState: MealRuntimeState;
}): Promise<WeeklyMealStat[]> => {
  if (!role) {
    return [];
  }

  if (runtimeState.qaMode) {
    return getQaWeeklyStats(date, role, runtimeState.qaAnchorDate);
  }

  return getWeeklyStats(date);
};

export const loadArchiveMealsForViewer = async ({
  role,
  runtimeState,
  query,
  type,
  participant,
  cursor,
  limit,
}: {
  role?: UserRole | null;
  runtimeState: MealRuntimeState;
} & ArchiveMealFilters): Promise<{
  meals: Meal[];
  nextCursor: string | null;
  hasMore: boolean;
  isPartial: boolean;
}> => {
  if (!role) {
    return {
      meals: [],
      nextCursor: null,
      hasMore: false,
      isPartial: false,
    };
  }

  if (runtimeState.qaMode) {
    return {
      meals: getQaArchiveMeals({
        role,
        referenceDate: runtimeState.qaAnchorDate,
        focalDate: runtimeState.qaAnchorDate,
        query,
        type,
        participant,
      }),
      nextCursor: null,
      hasMore: false,
      isPartial: false,
    };
  }

  return listArchiveMeals({
    query,
    type,
    participant,
    cursor,
    limit,
  });
};

export const loadMealForViewer = async ({
  role,
  mealId,
  runtimeState,
}: {
  role?: UserRole | null;
  mealId: string;
  runtimeState: MealRuntimeState;
}): Promise<Meal | null> => {
  if (!role) {
    return null;
  }

  if (runtimeState.qaMode) {
    return getQaMealDetail(
      role,
      mealId,
      runtimeState.qaAnchorDate,
      runtimeState.qaAnchorDate
    );
  }

  return getMealById(mealId);
};

export const loadSameDayMealsForViewer = async ({
  role,
  mealDate,
  runtimeState,
}: {
  role?: UserRole | null;
  mealDate: Date;
  runtimeState: MealRuntimeState;
}): Promise<Meal[]> => {
  if (!role) {
    return [];
  }

  if (runtimeState.qaMode) {
    return getQaSameDayMeals(role, mealDate);
  }

  return getMealsForDate(mealDate);
};
