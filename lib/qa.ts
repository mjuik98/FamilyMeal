export {
  isQaEnabled,
  isQaMockEnabledByEnv,
  isQaMockMode,
  QA_MOCK_MODE_KEY,
} from "@/lib/qa/mode";
export {
  getQaDefaultRole,
  getQaNotificationPreferences,
  getQaReadActivityIds,
  setQaNotificationPreferences,
  setQaReadActivityIds,
} from "@/lib/qa/session";
export {
  addQaCustomMeal,
  createQaMockActivities,
  createQaMockMeals,
  createQaMockRecentMeals,
  createQaMockWeekMeals,
  createQaMockWeeklyStats,
  getQaMockMealById,
} from "@/lib/qa/fixtures";
