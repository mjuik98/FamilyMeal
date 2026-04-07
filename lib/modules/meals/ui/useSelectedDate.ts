"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { parseDateKey } from "@/lib/date-utils";

export const useSelectedDate = ({
  qaMode,
  qaAnchorDate,
}: {
  qaMode: boolean;
  qaAnchorDate: Date;
}) => {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasExplicitDateSelection, setHasExplicitDateSelection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const routeSelectedDate = useMemo(
    () => parseDateKey(searchParams.get("date")),
    [searchParams]
  );

  const effectiveSelectedDate = useMemo(() => {
    if (hasExplicitDateSelection) return selectedDate;
    if (routeSelectedDate) return routeSelectedDate;
    if (qaMode) return qaAnchorDate;
    return selectedDate;
  }, [hasExplicitDateSelection, qaAnchorDate, qaMode, routeSelectedDate, selectedDate]);

  const selectDate = (nextDate: Date) => {
    setHasExplicitDateSelection(true);
    setSelectedDate(nextDate);
  };

  const onDateChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      selectDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      selectDate(value[0]);
    }
    setShowCalendar(false);
  };

  return {
    effectiveSelectedDate,
    showCalendar,
    setShowCalendar,
    selectDate,
    onDateChange,
  };
};
