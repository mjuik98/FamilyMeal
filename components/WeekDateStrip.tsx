"use client";

import type { WeeklyMealStat } from "@/lib/types";

const getDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekStart = (referenceDate: Date) => {
  const base = new Date(referenceDate);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - base.getDay());
  return base;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export default function WeekDateStrip({
  selectedDate,
  stats,
  onSelectDate,
}: {
  selectedDate: Date;
  stats: WeeklyMealStat[];
  onSelectDate: (date: Date) => void;
}) {
  const weekStart = getWeekStart(selectedDate);
  const today = new Date();
  const statMap = new Map(stats.map((item) => [getDayKey(item.date), item]));

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const stat = statMap.get(getDayKey(date));
    return {
      date,
      label: ["일", "월", "화", "수", "목", "금", "토"][date.getDay()],
      count: stat?.count ?? 0,
      previewImageUrl: stat?.previewImageUrl,
    };
  });

  return (
    <div className="week-date-strip" data-testid="week-date-strip">
      {days.map((day) => {
        const dayKey = getDayKey(day.date);
        const active = isSameDay(day.date, selectedDate);
        const hasMeals = day.count > 0;
        const isToday = isSameDay(day.date, today);
        const status = active ? "selected" : hasMeals ? "filled" : isToday ? "today-empty" : "empty";

        return (
          <button
            key={dayKey}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={`week-date-button week-date-button-${status}${active ? " week-date-button-active" : ""}`}
            data-testid={`week-date-button-${dayKey}`}
            data-active={active ? "true" : "false"}
            data-has-meals={hasMeals ? "true" : "false"}
            data-status={status}
          >
            {day.previewImageUrl ? (
              <span className="week-date-thumbnail-shell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={day.previewImageUrl}
                  alt={`${day.label} 대표 식사`}
                  className="week-date-thumbnail"
                />
              </span>
            ) : (
              <span className="week-date-thumbnail-shell week-date-thumbnail-shell-empty" />
            )}
            <span className="week-date-label">{day.label}</span>
            <span className="week-date-number">{day.date.getDate()}</span>
            <span className="week-date-count">
              {hasMeals ? `${day.count}개` : isToday ? "오늘 비었어요" : "기록 없음"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
