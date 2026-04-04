"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type MealRuntimeState,
  watchMealsForViewerDate,
} from "@/lib/features/meals/application/meal-read-service";
import { formatDateKey } from "@/lib/date-utils";
import { logError } from "@/lib/logging";
import type { Meal, UserRole } from "@/lib/types";

export const useMealsForDateController = ({
  effectiveSelectedDate,
  runtimeState,
  role,
}: {
  effectiveSelectedDate: Date;
  runtimeState: MealRuntimeState;
  role?: UserRole | null;
}) => {
  const [remoteMeals, setRemoteMeals] = useState<Meal[]>([]);
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const [loadedRole, setLoadedRole] = useState<UserRole | null>(null);
  const currentDateKey = useMemo(
    () => formatDateKey(effectiveSelectedDate),
    [effectiveSelectedDate]
  );

  useEffect(() => {
    if (!role) {
      return;
    }

    return watchMealsForViewerDate({
      date: effectiveSelectedDate,
      role,
      runtimeState,
      onMeals: (data) => {
        setRemoteMeals(data);
        setLoadedDateKey(currentDateKey);
        setLoadedRole(role);
      },
      onError: (error) => {
        logError("Failed to load meals", error);
        setRemoteMeals([]);
        setLoadedDateKey(currentDateKey);
        setLoadedRole(role);
      },
    });
  }, [currentDateKey, effectiveSelectedDate, role, runtimeState]);

  const meals = useMemo(
    () =>
      loadedDateKey === currentDateKey && loadedRole === role && role
        ? remoteMeals
        : [],
    [
      currentDateKey,
      loadedDateKey,
      loadedRole,
      remoteMeals,
      role,
    ]
  );

  return {
    meals,
    loadingMeals:
      Boolean(role) &&
      (loadedDateKey !== currentDateKey || loadedRole !== role),
  };
};

export { useMealsForDateController as useMealsForDate };
