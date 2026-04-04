import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";
import {
  createMealRuntimeState,
  loadArchiveMealsForViewerInRuntime,
  loadMealForViewerInRuntime,
  loadSameDayMealsForViewerInRuntime,
  loadWeeklyStatsForViewerInRuntime,
  type MealRuntimeState,
  watchMealsForViewerDateInRuntime,
} from "@/lib/modules/meals/infrastructure/meal-read-runtime";
import type { MealParticipantFilter, MealTypeFilter } from "@/lib/modules/meals/contracts";

export { createMealRuntimeState };
export type { MealRuntimeState };

type ArchiveMealFilters = {
  query: string;
  type: MealTypeFilter;
  participant: MealParticipantFilter;
  cursor?: string | null;
  limit?: number;
};

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
  return watchMealsForViewerDateInRuntime({
    date,
    role,
    runtimeState,
    onMeals,
    onError,
  });
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
  return loadWeeklyStatsForViewerInRuntime({
    role,
    date,
    runtimeState,
  });
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
  return loadArchiveMealsForViewerInRuntime({
    role,
    runtimeState,
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
  return loadMealForViewerInRuntime({
    role,
    mealId,
    runtimeState,
  });
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
  return loadSameDayMealsForViewerInRuntime({
    role,
    mealDate,
    runtimeState,
  });
};
