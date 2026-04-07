"use client";

import { useMemo, useState } from "react";

import { useUser } from "@/lib/modules/profile/ui/UserSessionProvider";
import { formatDateKey } from "@/lib/date-utils";
import { createMealRuntimeState } from "@/lib/modules/meals/application/meal-read-service";
import { useSelectedDate } from "@/lib/modules/meals/ui/useSelectedDate";
import { useMealsForDateController as useMealsForDate } from "@/lib/modules/meals/ui/useMealsForDateController";
import { useWeeklyStatsController as useWeeklyStats } from "@/lib/modules/meals/ui/useWeeklyStatsController";

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

export const useHomePageController = () => {
  const { user, userProfile, loading, signOut } = useUser();
  const [runtimeState] = useState(() => createMealRuntimeState({ anchorHour: 0 }));
  const { effectiveSelectedDate, showCalendar, setShowCalendar, selectDate, onDateChange } =
    useSelectedDate({
      qaMode: runtimeState.qaMode,
      qaAnchorDate: runtimeState.qaAnchorDate,
    });
  const { meals, loadingMeals } = useMealsForDate({
    effectiveSelectedDate,
    runtimeState,
    role: userProfile?.role,
  });
  const weeklyStats = useWeeklyStats({
    effectiveSelectedDate,
    runtimeState,
    role: userProfile?.role,
  });

  const selectedDateLabel = useMemo(() => formatLongDate(effectiveSelectedDate), [effectiveSelectedDate]);
  const weeklyTotal = useMemo(
    () => weeklyStats.reduce((sum, day) => sum + day.count, 0),
    [weeklyStats]
  );
  const hasMeals = meals.length > 0;
  const isToday = isSameDay(effectiveSelectedDate, new Date());

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "조용한 새벽 기록";
    if (hour < 12) return "아침 식사 기록";
    if (hour < 18) return "오늘의 식사 기록";
    return "저녁 식사 기록";
  }, []);

  return {
    addMealHref: `/add?date=${formatDateKey(effectiveSelectedDate)}`,
    effectiveSelectedDate,
    greeting,
    hasMeals,
    isToday,
    loading,
    loadingMeals,
    meals,
    role: userProfile?.role ?? null,
    selectedDateLabel,
    showCalendar,
    showLogin: !loading && (!user || !userProfile?.role),
    signOut,
    toggleCalendar: () => setShowCalendar((prev) => !prev),
    onCalendarDateChange: onDateChange,
    onSelectDate: (date: Date) => {
      selectDate(date);
      setShowCalendar(false);
    },
    selectToday: () => selectDate(new Date()),
    weeklyStats,
    weeklyTotal,
  };
};
