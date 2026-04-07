import { isUserRole } from "@/lib/domain/user-role";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { UserRole } from "@/lib/types";

type MealVisibilitySource = {
  userId?: unknown;
  userIds?: unknown;
};

const getMealParticipantRoles = (meal: MealVisibilitySource): UserRole[] => {
  const normalizedUserIds = Array.isArray(meal.userIds)
    ? meal.userIds.filter((value): value is UserRole => isUserRole(value))
    : [];

  if (normalizedUserIds.length > 0) {
    return normalizedUserIds;
  }

  return isUserRole(meal.userId) ? [meal.userId] : [];
};

export const isMealVisibleToRole = (
  meal: MealVisibilitySource,
  actorRole: UserRole
): boolean => getMealParticipantRoles(meal).includes(actorRole);

export const assertMealVisibleToRole = (
  meal: MealVisibilitySource,
  actorRole: UserRole
): void => {
  if (!isMealVisibleToRole(meal, actorRole)) {
    throw new RouteError("Not allowed", 403);
  }
};
