import { isQaMockMode, QA_MOCK_MODE_KEY } from "@/lib/qa/mode";
import {
  clearQaRuntimeSession as clearQaProfileRuntimeSession,
  getQaUserContextValue as getQaProfileUserContextValue,
  saveQaRuntimeNotificationPreferences as saveQaProfileNotificationPreferences,
  setQaRuntimeRole as setQaProfileRuntimeRole,
} from "@/lib/qa/adapters/profile";
import {
  deleteQaMeal as deleteQaMealRecord,
  getQaArchiveMeals as getQaArchiveMealsFromAdapter,
  getQaMealDetail as getQaMealDetailFromAdapter,
  getQaMealsForDate as getQaMealsForDateFromAdapter,
  getQaSameDayMeals as getQaSameDayMealsFromAdapter,
  getQaWeeklyStats as getQaWeeklyStatsFromAdapter,
  saveQaMeal as saveQaMealRecord,
} from "@/lib/qa/adapters/meals";
import type {
  Meal,
  NotificationPreferences,
  UserProfile,
  UserRole,
  WeeklyMealStat,
} from "@/lib/types";

export const isQaRuntimeActive = () => isQaMockMode();

export const getQaUserContextValue = (role?: UserRole) =>
  getQaProfileUserContextValue(role);

export const clearQaRuntimeSession = () => {
  clearQaProfileRuntimeSession();
};

export const setQaRuntimeRole = (
  role: UserRole,
  previousProfile?: UserProfile | null
): UserProfile => setQaProfileRuntimeRole(role, previousProfile);

export const saveQaRuntimeNotificationPreferences = (
  preferences: NotificationPreferences,
  previousProfile?: UserProfile | null
): UserProfile =>
  saveQaProfileNotificationPreferences(preferences, previousProfile);

export const getQaMealsForDate = (
  role: UserRole,
  date: Date,
  anchorDate: Date
): Meal[] => getQaMealsForDateFromAdapter(role, date, anchorDate);

export const getQaWeeklyStats = (
  date: Date,
  role: UserRole,
  anchorDate: Date
): WeeklyMealStat[] => getQaWeeklyStatsFromAdapter(date, role, anchorDate);

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
  getQaArchiveMealsFromAdapter({
    role,
    referenceDate,
    focalDate,
    query,
    type,
    participant,
  });

export const getQaMealDetail = (
  role: UserRole,
  mealId: string,
  referenceDate: Date = new Date(),
  focalDate: Date = new Date()
): Meal | null =>
  getQaMealDetailFromAdapter(role, mealId, referenceDate, focalDate);

export const getQaSameDayMeals = (
  role: UserRole,
  mealDate: Date
): Meal[] => getQaSameDayMealsFromAdapter(role, mealDate);

export const saveQaMeal = (meal: Meal) => {
  saveQaMealRecord(meal);
};

export const deleteQaMeal = (mealId: string) => {
  deleteQaMealRecord(mealId);
};

export { QA_MOCK_MODE_KEY };
