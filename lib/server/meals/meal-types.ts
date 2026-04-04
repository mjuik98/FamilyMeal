import {
  isMealType,
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
} from "@/lib/domain/meal-policy";
import { normalizeErrorCode } from "@/lib/platform/errors/error-contract";
import { normalizeReactionMap } from "@/lib/reactions";
import type { Meal, UserRole } from "@/lib/types";

export type StoredMealDoc = {
  ownerUid?: unknown;
  userId?: unknown;
  userIds?: unknown;
  keywords?: unknown;
  imageUrl?: unknown;
  description?: unknown;
  type?: unknown;
  timestamp?: unknown;
  commentCount?: unknown;
  reactions?: unknown;
};

export type CreateMealInput = {
  userIds: unknown;
  description: unknown;
  type: unknown;
  imageUrl: unknown;
  timestamp?: unknown;
};

export type UpdateMealInput = {
  ownerUid?: unknown;
  userIds?: unknown;
  description?: unknown;
  type?: unknown;
  imageUrl?: unknown;
  timestamp?: unknown;
};

export class MealRouteError extends Error {
  code: string;
  status: number;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "MealRouteError";
    this.code = code ?? normalizeErrorCode(message, status >= 500 ? "internal_error" : "meal_request_invalid");
    this.status = status;
  }
}

const toMillis = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return fallback;
};

export const normalizeMealDescription = (description: unknown): string => {
  if (typeof description !== "string") {
    throw new MealRouteError("Meal description is required", 400);
  }
  const trimmed = description.trim();
  if (!trimmed) {
    throw new MealRouteError("Meal description is empty", 400);
  }
  if (trimmed.length > MAX_MEAL_DESCRIPTION_LENGTH) {
    throw new MealRouteError(`Meal description must be <= ${MAX_MEAL_DESCRIPTION_LENGTH} characters`, 400);
  }
  return trimmed;
};

export const normalizeMealType = (type: unknown): Meal["type"] => {
  if (!isMealType(type)) {
    throw new MealRouteError("Invalid meal type", 400);
  }
  return type;
};

export const normalizeMealParticipants = (userIds: unknown): UserRole[] => {
  if (!Array.isArray(userIds)) {
    throw new MealRouteError("Meal participants are required", 400);
  }

  const normalized = Array.from(new Set(userIds.filter((value): value is UserRole => isUserRole(value))));
  if (normalized.length === 0) {
    throw new MealRouteError("Meal participants are required", 400);
  }

  return normalized;
};

export const normalizeImageUrl = (imageUrl: unknown): string => {
  if (typeof imageUrl !== "string") {
    throw new MealRouteError("Meal image URL is required", 400);
  }
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEAL_IMAGE_URL_LENGTH || !/^https?:\/\//.test(trimmed)) {
    throw new MealRouteError("Invalid meal image URL", 400);
  }
  return trimmed;
};

export const buildMealKeywords = (meal: Pick<Meal, "description" | "type" | "userIds" | "userId">): string[] => {
  const participantRoles =
    meal.userIds?.length ? meal.userIds : meal.userId ? [meal.userId] : [];
  const raw = `${meal.description} ${meal.type} ${participantRoles.join(" ")}`.toLowerCase();
  const tokens = raw
    .split(/[\s,./!?()[\]{}"'`~:;|\\-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return Array.from(new Set(tokens));
};

export const getTimestampMillis = (value: unknown, fallback = Date.now()): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
};

export const serializeMealDocument = (id: string, data: StoredMealDoc): Meal => {
  const normalizedUserIds = Array.isArray(data.userIds)
    ? data.userIds.filter((value): value is UserRole => isUserRole(value))
    : [];
  const userIds = normalizedUserIds.length > 0 ? normalizedUserIds : isUserRole(data.userId) ? [data.userId] : [];
  const timestamp = toMillis(data.timestamp, Date.now());
  const commentCount =
    typeof data.commentCount === "number" && Number.isFinite(data.commentCount)
      ? Math.max(0, Math.floor(data.commentCount))
      : 0;

  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : undefined,
    userId: isUserRole(data.userId) ? data.userId : undefined,
    userIds,
    keywords: Array.isArray(data.keywords)
      ? data.keywords.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    description: typeof data.description === "string" ? data.description : "",
    type: isMealType(data.type) ? data.type : "점심",
    timestamp,
    commentCount,
    reactions: normalizeReactionMap(data.reactions),
  };
};
