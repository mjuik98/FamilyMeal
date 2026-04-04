"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadWeeklyStatsForViewer,
  type MealRuntimeState,
} from "@/lib/features/meals/application/meal-read-service";
import { logError } from "@/lib/logging";
import type { UserRole, WeeklyMealStat } from "@/lib/types";

export const useWeeklyStatsController = ({
  effectiveSelectedDate,
  runtimeState,
  role,
}: {
  effectiveSelectedDate: Date;
  runtimeState: MealRuntimeState;
  role?: UserRole | null;
}) => {
  const [remoteWeeklyStats, setRemoteWeeklyStats] = useState<WeeklyMealStat[]>([]);
  const [loadedWeekKey, setLoadedWeekKey] = useState<string | null>(null);
  const weekKey = useMemo(() => {
    const startOfWeek = new Date(effectiveSelectedDate);
    startOfWeek.setHours(12, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(
      startOfWeek.getDate()
    ).padStart(2, "0")}`;
  }, [effectiveSelectedDate]);

  useEffect(() => {
    if (!role) {
      setRemoteWeeklyStats([]);
      setLoadedWeekKey(null);
      return;
    }

    let active = true;
    let requestSequence = 0;

    const loadWeeklyStats = async () => {
      const requestId = ++requestSequence;
      try {
        const stats = await loadWeeklyStatsForViewer({
          role,
          date: effectiveSelectedDate,
          runtimeState,
        });
        if (!active || requestId !== requestSequence) {
          return;
        }
        setRemoteWeeklyStats(stats);
        setLoadedWeekKey(weekKey);
      } catch (error) {
        if (!active || requestId !== requestSequence) {
          return;
        }
        logError("Failed to load weekly stats", error);
        setRemoteWeeklyStats([]);
        setLoadedWeekKey(weekKey);
      }
    };

    void loadWeeklyStats();

    if (typeof window === "undefined") {
      return () => {
        active = false;
        requestSequence += 1;
      };
    }

    const handleFocus = () => {
      void loadWeeklyStats();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadWeeklyStats();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      requestSequence += 1;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [effectiveSelectedDate, role, runtimeState, weekKey]);

  const weeklyStats = useMemo(
    () =>
      role
        ? loadedWeekKey === weekKey
          ? remoteWeeklyStats
          : []
        : [],
    [loadedWeekKey, remoteWeeklyStats, role, weekKey]
  );

  return weeklyStats;
};

export { useWeeklyStatsController as useWeeklyStats };
