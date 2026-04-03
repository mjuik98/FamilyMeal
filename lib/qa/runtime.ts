import type { User } from "firebase/auth";

import { filterAndSortMeals } from "@/lib/client/meal-filters";
import {
  addQaCustomMeal,
  createQaMockMeals,
  createQaMockRecentMeals,
  createQaMockWeeklyStats,
  getQaMockMealById,
} from "@/lib/qa/fixtures";
import { isQaMockMode, QA_MOCK_MODE_KEY } from "@/lib/qa/mode";
import {
  getQaDefaultRole,
  getQaNotificationPreferences,
  setQaNotificationPreferences,
} from "@/lib/qa/session";
import type {
  Meal,
  NotificationPreferences,
  UserProfile,
  UserRole,
  WeeklyMealStat,
} from "@/lib/types";

const createQaUser = (): User => ({ uid: "qa-user" } as User);

const createQaProfile = (
  role: UserRole = getQaDefaultRole(),
  notificationPreferences: NotificationPreferences = getQaNotificationPreferences()
): UserProfile => ({
  uid: "qa-user",
  email: "qa@example.com",
  displayName: "QA User",
  role,
  notificationPreferences,
});

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isQaRuntimeActive = () => isQaMockMode();

export const getQaUserContextValue = (role: UserRole = getQaDefaultRole()) => ({
  user: createQaUser(),
  userProfile: createQaProfile(role),
});

export const clearQaRuntimeSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QA_MOCK_MODE_KEY);
  }
};

export const setQaRuntimeRole = (
  role: UserRole,
  previousProfile?: UserProfile | null
): UserProfile =>
  createQaProfile(
    role,
    previousProfile?.notificationPreferences ?? getQaNotificationPreferences()
  );

export const saveQaRuntimeNotificationPreferences = (
  preferences: NotificationPreferences,
  previousProfile?: UserProfile | null
): UserProfile => {
  setQaNotificationPreferences(preferences);
  return createQaProfile(previousProfile?.role ?? getQaDefaultRole(), preferences);
};

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

export { QA_MOCK_MODE_KEY };
