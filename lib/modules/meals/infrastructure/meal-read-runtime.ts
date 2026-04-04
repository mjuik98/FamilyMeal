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

import type { ArchiveMealsQuery, MealParticipantFilter, MealTypeFilter } from "@/lib/modules/meals/contracts";

export type MealRuntimeState = {
  qaMode: boolean;
  qaAnchorDate: Date;
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

const selectMealReadRuntime = (runtimeState: MealRuntimeState) => {
  if (runtimeState.qaMode) {
    return {
      watchMealsForViewerDate: ({
        date,
        role,
        onMeals,
      }: {
        date: Date;
        role: UserRole;
        onMeals: (meals: Meal[]) => void;
      }) => {
        onMeals(getQaMealsForDate(role, date, runtimeState.qaAnchorDate));
        return () => undefined;
      },
      loadWeeklyStatsForViewer: ({
        role,
        date,
      }: {
        role: UserRole;
        date: Date;
      }) => Promise.resolve(getQaWeeklyStats(date, role, runtimeState.qaAnchorDate)),
      loadArchiveMealsForViewer: ({
        role,
        query,
        type,
        participant,
      }: {
        role: UserRole;
        query: string;
        type: MealTypeFilter;
        participant: MealParticipantFilter;
      }) =>
        Promise.resolve({
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
        }),
      loadMealForViewer: ({
        role,
        mealId,
      }: {
        role: UserRole;
        mealId: string;
      }) =>
        Promise.resolve(
          getQaMealDetail(
            role,
            mealId,
            runtimeState.qaAnchorDate,
            runtimeState.qaAnchorDate
          )
        ),
      loadSameDayMealsForViewer: ({
        role,
        mealDate,
      }: {
        role: UserRole;
        mealDate: Date;
      }) => Promise.resolve(getQaSameDayMeals(role, mealDate)),
    };
  }

  return {
    watchMealsForViewerDate: ({
      date,
      onMeals,
      onError,
    }: {
      date: Date;
      role: UserRole;
      onMeals: (meals: Meal[]) => void;
      onError?: (error: Error) => void;
    }) => subscribeMealsForDate(date, onMeals, onError),
    loadWeeklyStatsForViewer: ({ date }: { role: UserRole; date: Date }) =>
      getWeeklyStats(date),
    loadArchiveMealsForViewer: ({
      query,
      type,
      participant,
      cursor,
      limit,
    }: Required<Pick<ArchiveMealsQuery, "query" | "type" | "participant">> &
      Pick<ArchiveMealsQuery, "cursor" | "limit"> & { role: UserRole }) =>
      listArchiveMeals({
        query,
        type,
        participant,
        cursor,
        limit,
      }),
    loadMealForViewer: ({ mealId }: { role: UserRole; mealId: string }) =>
      getMealById(mealId),
    loadSameDayMealsForViewer: ({
      mealDate,
    }: {
      role: UserRole;
      mealDate: Date;
    }) => getMealsForDate(mealDate),
  };
};

export const watchMealsForViewerDateInRuntime = ({
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

  return selectMealReadRuntime(runtimeState).watchMealsForViewerDate({
    date,
    role,
    onMeals,
    onError,
  });
};

export const loadWeeklyStatsForViewerInRuntime = ({
  role,
  date,
  runtimeState,
}: {
  role?: UserRole | null;
  date: Date;
  runtimeState: MealRuntimeState;
}): Promise<WeeklyMealStat[]> => {
  if (!role) {
    return Promise.resolve([]);
  }

  return selectMealReadRuntime(runtimeState).loadWeeklyStatsForViewer({
    role,
    date,
  });
};

export const loadArchiveMealsForViewerInRuntime = ({
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
  query: string;
  type: MealTypeFilter;
  participant: MealParticipantFilter;
  cursor?: string | null;
  limit?: number;
}) => {
  if (!role) {
    return Promise.resolve({
      meals: [],
      nextCursor: null,
      hasMore: false,
      isPartial: false,
    });
  }

  return selectMealReadRuntime(runtimeState).loadArchiveMealsForViewer({
    role,
    query,
    type,
    participant,
    cursor,
    limit,
  });
};

export const loadMealForViewerInRuntime = ({
  role,
  mealId,
  runtimeState,
}: {
  role?: UserRole | null;
  mealId: string;
  runtimeState: MealRuntimeState;
}): Promise<Meal | null> => {
  if (!role) {
    return Promise.resolve(null);
  }

  return selectMealReadRuntime(runtimeState).loadMealForViewer({
    role,
    mealId,
  });
};

export const loadSameDayMealsForViewerInRuntime = ({
  role,
  mealDate,
  runtimeState,
}: {
  role?: UserRole | null;
  mealDate: Date;
  runtimeState: MealRuntimeState;
}): Promise<Meal[]> => {
  if (!role) {
    return Promise.resolve([]);
  }

  return selectMealReadRuntime(runtimeState).loadSameDayMealsForViewer({
    role,
    mealDate,
  });
};
