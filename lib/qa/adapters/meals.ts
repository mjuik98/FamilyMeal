import { filterAndSortMeals } from "@/lib/client/meal-filters";
import {
  addQaCustomMeal,
  createQaMockMeals,
  createQaMockRecentMeals,
  createQaMockWeeklyStats,
  deleteQaCustomMeal,
  getQaMockMealById,
} from "@/lib/qa/fixtures";
import { isQaMockMode } from "@/lib/qa/mode";
import type { Meal, UserRole, WeeklyMealStat } from "@/lib/types";

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isQaMealsRuntimeActive = (): boolean => isQaMockMode();

export const getQaMealsForDate = (
  role: UserRole,
  date: Date,
  anchorDate: Date
): Meal[] => createQaMockMeals(role, date, anchorDate);

export const getQaWeeklyStats = (
  date: Date,
  role: UserRole,
  anchorDate: Date
): WeeklyMealStat[] => createQaMockWeeklyStats(date, role, anchorDate);

export const getQaArchiveMeals = ({
  role,
  referenceDate,
  focalDate,
  query,
  type,
  participant,
}: {
  role: UserRole;
  referenceDate: Date;
  focalDate: Date;
  query: string;
  type: Meal["type"] | "전체";
  participant: UserRole | "전체";
}): Meal[] =>
  filterAndSortMeals(createQaMockRecentMeals(role, referenceDate, focalDate), {
    query,
    type,
    participant,
    sort: "recent",
  });

export const getQaMealDetail = (
  role: UserRole,
  mealId: string,
  referenceDate: Date = new Date(),
  focalDate: Date = new Date()
): Meal | null => getQaMockMealById(role, mealId, referenceDate, focalDate);

export const getQaSameDayMeals = (
  role: UserRole,
  mealDate: Date
): Meal[] =>
  createQaMockRecentMeals(role, mealDate, mealDate).filter((item) =>
    isSameDay(new Date(item.timestamp), mealDate)
  );

export const saveQaMeal = (meal: Meal) => {
  addQaCustomMeal(meal);
};

export const deleteQaMeal = (mealId: string) => {
  deleteQaCustomMeal(mealId);
};
