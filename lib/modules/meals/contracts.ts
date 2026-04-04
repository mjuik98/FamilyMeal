import type { Meal, UserRole } from "@/lib/types";

export type MealType = Meal["type"];
export type MealParticipantFilter = UserRole | "전체";
export type MealTypeFilter = MealType | "전체";

export type CreateMealCommand = {
  userIds: UserRole[];
  description: string;
  type: MealType;
  imageUrl: string;
  timestamp?: number;
};

export type UpdateMealCommand = {
  userIds?: UserRole[];
  description?: string;
  type?: MealType;
  imageUrl?: string | null;
  timestamp?: number;
};

export type ArchiveMealsQuery = {
  query?: string;
  type?: MealTypeFilter;
  participant?: MealParticipantFilter;
  cursor?: string | null;
  limit?: number;
};
