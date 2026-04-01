import type { Meal, UserRole } from "@/lib/types";

export const USER_ROLES = ["아빠", "엄마", "딸", "아들"] as const satisfies readonly UserRole[];
export const VALID_MEAL_TYPES = ["아침", "점심", "저녁", "간식"] as const satisfies readonly Meal["type"][];

export const MAX_MEAL_DESCRIPTION_LENGTH = 300;
export const MAX_MEAL_IMAGE_URL_LENGTH = 2048;
export const MAX_COMMENT_LENGTH = 500;
export const SEARCH_INDEX_LIMIT = 300;
export const SEARCH_FALLBACK_LIMIT = 300;

export const VALID_USER_ROLE_SET = new Set<UserRole>(USER_ROLES);
export const VALID_MEAL_TYPE_SET = new Set<Meal["type"]>(VALID_MEAL_TYPES);

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && VALID_USER_ROLE_SET.has(value as UserRole);

export const isMealType = (value: unknown): value is Meal["type"] =>
  typeof value === "string" && VALID_MEAL_TYPE_SET.has(value as Meal["type"]);
