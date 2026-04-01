export { users } from "@/lib/client/profile";
export {
  addMeal,
  countCommentReactions,
  countMealReactions,
  deleteMeal,
  filterAndSortMeals,
  getMealById,
  getMealCommentCount,
  getMealsForDate,
  getRecentMeals,
  getWeeklyStats,
  searchMeals,
  subscribeMealsForDate,
  updateMeal,
} from "@/lib/client/meals";
export type { MealSortOrder, MealUpdateInput } from "@/lib/client/meals";
export {
  addMealComment,
  deleteMealComment,
  getMealComments,
  updateMealComment,
} from "@/lib/client/comments";
export {
  toggleMealCommentReaction,
  toggleMealReaction,
} from "@/lib/client/reactions";
export { mapUserActivitiesToFeedItems, markAllActivitiesRead, subscribeUserActivity, updateNotificationPreferences } from "@/lib/client/activity";
