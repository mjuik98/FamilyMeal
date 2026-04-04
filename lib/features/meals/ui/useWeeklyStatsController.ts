"use client";

import { useEffect, useMemo, useState } from "react";

import { getWeeklyStats } from "@/lib/client/meals";
import { logError } from "@/lib/logging";
import { getQaWeeklyStats } from "@/lib/qa/runtime";
import type { UserRole, WeeklyMealStat } from "@/lib/types";

export const useWeeklyStatsController = ({
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
    if (!role || qaMode) {
      setRemoteWeeklyStats([]);
      setLoadedWeekKey(null);
      return;
    }

    let active = true;
    let requestSequence = 0;

    const loadWeeklyStats = async () => {
      const requestId = ++requestSequence;
      try {
        const stats = await getWeeklyStats(effectiveSelectedDate);
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
  }, [effectiveSelectedDate, qaMode, role, weekKey]);

  const weeklyStats = useMemo(
    () =>
      qaMode && role
        ? getQaWeeklyStats(effectiveSelectedDate, role, qaAnchorDate)
        : role
          ? loadedWeekKey === weekKey
            ? remoteWeeklyStats
            : []
          : [],
    [effectiveSelectedDate, loadedWeekKey, qaAnchorDate, qaMode, remoteWeeklyStats, role, weekKey]
  );

  return weeklyStats;
};

export { useWeeklyStatsController as useWeeklyStats };
