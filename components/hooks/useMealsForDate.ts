"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeMealsForDate } from "@/lib/client/meals";
import { formatDateKey } from "@/lib/date-utils";
import { createQaMockMeals } from "@/lib/qa";
import type { Meal, UserRole } from "@/lib/types";

export const useMealsForDate = ({
  effectiveSelectedDate,
  qaMode,
  qaAnchorDate,
  role,
}: {
  effectiveSelectedDate: Date;
  qaMode: boolean;
  qaAnchorDate: Date;
  role?: UserRole | null;
}) => {
  const [remoteMeals, setRemoteMeals] = useState<Meal[]>([]);
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const currentDateKey = useMemo(
    () => formatDateKey(effectiveSelectedDate),
    [effectiveSelectedDate]
  );

  useEffect(() => {
    if (!role || qaMode) {
      return;
    }

    return subscribeMealsForDate(
      effectiveSelectedDate,
      (data) => {
        setRemoteMeals(data);
        setLoadedDateKey(currentDateKey);
      },
      (error) => {
        console.error("Failed to load meals", error);
        setRemoteMeals([]);
        setLoadedDateKey(currentDateKey);
      }
    );
  }, [currentDateKey, effectiveSelectedDate, qaMode, role]);

  const meals = useMemo(
    () =>
      qaMode && role
        ? createQaMockMeals(role, effectiveSelectedDate, qaAnchorDate)
        : loadedDateKey === currentDateKey && role
          ? remoteMeals
          : [],
    [currentDateKey, effectiveSelectedDate, loadedDateKey, qaAnchorDate, qaMode, remoteMeals, role]
  );

  return {
    meals,
    loadingMeals: qaMode ? false : Boolean(role) && loadedDateKey !== currentDateKey,
  };
};
