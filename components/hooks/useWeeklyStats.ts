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
  const [remoteWeeklyStats, setRemoteWeeklyStats] = useState<WeeklyMealStat[]>([]);

  useEffect(() => {
    if (!role) return;

    if (qaMode) {
      return;
    }

    getWeeklyStats(effectiveSelectedDate)
      .then((stats) => setRemoteWeeklyStats(stats))
      .catch((error) => {
        console.error("Failed to load weekly stats", error);
        setRemoteWeeklyStats([]);
      });
  }, [effectiveSelectedDate, qaMode, role]);

  const weeklyStats = useMemo(
    () =>
      qaMode && role
        ? createQaMockWeeklyStats(effectiveSelectedDate, role, qaAnchorDate)
        : remoteWeeklyStats,
    [effectiveSelectedDate, qaAnchorDate, qaMode, remoteWeeklyStats, role]
  );

  return weeklyStats;
};
