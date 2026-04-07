import type { Meal } from "@/lib/types";

export const VALID_MEAL_TYPES = ["아침", "점심", "저녁", "간식"] as const satisfies readonly Meal["type"][];

export const MAX_MEAL_DESCRIPTION_LENGTH = 300;
export const MAX_MEAL_IMAGE_URL_LENGTH = 2048;
export const SEARCH_INDEX_LIMIT = 300;
export const SEARCH_FALLBACK_LIMIT = 300;

export const VALID_MEAL_TYPE_SET = new Set<Meal["type"]>(VALID_MEAL_TYPES);

export const isMealType = (value: unknown): value is Meal["type"] =>
  typeof value === "string" && VALID_MEAL_TYPE_SET.has(value as Meal["type"]);
