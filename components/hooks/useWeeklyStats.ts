"use client";

import { useEffect, useMemo, useState } from "react";

import { getWeeklyStats } from "@/lib/data";
import { createQaMockWeeklyStats } from "@/lib/qa";
import type { UserRole, WeeklyMealStat } from "@/lib/types";

export const useWeeklyStats = ({
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
  const [weeklyStatsCache, setWeeklyStatsCache] = useState<Record<string, WeeklyMealStat[]>>({});
  const weekKey = useMemo(() => {
    const startOfWeek = new Date(effectiveSelectedDate);
    startOfWeek.setHours(12, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(
      startOfWeek.getDate()
    ).padStart(2, "0")}`;
  }, [effectiveSelectedDate]);
  const cachedWeekStats = weeklyStatsCache[weekKey];

  useEffect(() => {
    if (!role || qaMode) {
      return;
    }

    if (cachedWeekStats) {
      return;
    }

    let isActive = true;
    getWeeklyStats(effectiveSelectedDate)
      .then((stats) => {
        if (!isActive) {
          return;
        }
        setWeeklyStatsCache((currentCache) => {
          if (currentCache[weekKey]) {
            return currentCache;
          }
          return {
            ...currentCache,
            [weekKey]: stats,
          };
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        console.error("Failed to load weekly stats", error);
      });

    return () => {
      isActive = false;
    };
  }, [cachedWeekStats, effectiveSelectedDate, qaMode, role, weekKey]);

  const weeklyStats = useMemo(
    () =>
      qaMode && role
        ? createQaMockWeeklyStats(effectiveSelectedDate, role, qaAnchorDate)
        : role
          ? cachedWeekStats ?? []
          : [],
    [cachedWeekStats, effectiveSelectedDate, qaAnchorDate, qaMode, role]
  );

  return weeklyStats;
};
