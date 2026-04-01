import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { serverEnv } from "@/lib/config/server-env";
import {
  isMealType,
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
} from "@/lib/domain/meal-policy";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { normalizeReactionMap } from "@/lib/reactions";
import type { Meal, UserRole } from "@/lib/types";

type StoredMealDoc = {
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

type CreateMealInput = {
  userIds: unknown;
  description: unknown;
  type: unknown;
  imageUrl: unknown;
  timestamp?: unknown;
};

type UpdateMealInput = {
  ownerUid?: unknown;
  userIds?: unknown;
  description?: unknown;
  type?: unknown;
  imageUrl?: unknown;
};

export class MealRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MealRouteError";
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

const normalizeMealDescription = (description: unknown): string => {
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

const normalizeMealType = (type: unknown): Meal["type"] => {
  if (!isMealType(type)) {
    throw new MealRouteError("Invalid meal type", 400);
  }
  return type;
};

const normalizeMealParticipants = (userIds: unknown): UserRole[] => {
  if (!Array.isArray(userIds)) {
    throw new MealRouteError("Meal participants are required", 400);
  }

  const normalized = Array.from(
    new Set(
      userIds.filter((value): value is UserRole => isUserRole(value))
    )
  );

  if (normalized.length === 0) {
    throw new MealRouteError("Meal participants are required", 400);
  }

  return normalized;
};

const normalizeImageUrl = (imageUrl: unknown): string => {
  if (typeof imageUrl !== "string") {
    throw new MealRouteError("Meal image URL is required", 400);
  }
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEAL_IMAGE_URL_LENGTH || !/^https?:\/\//.test(trimmed)) {
    throw new MealRouteError("Invalid meal image URL", 400);
  }
  return trimmed;
};

const buildMealKeywords = (meal: Pick<Meal, "description" | "type" | "userIds" | "userId">): string[] => {
  const raw = `${meal.description} ${meal.type} ${(meal.userIds || (meal.userId ? [meal.userId] : [])).join(" ")}`.toLowerCase();
  const tokens = raw
    .split(/[\s,./!?()[\]{}"'`~:;|\\-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return Array.from(new Set(tokens));
};

const getTimestampMillis = (value: unknown, fallback = Date.now()): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
};

export const serializeMealDocument = (id: string, data: StoredMealDoc): Meal => {
  const userIds = Array.isArray(data.userIds)
    ? data.userIds.filter((value): value is UserRole => isUserRole(value))
    : [];
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

export const isLegacyParticipant = (meal: StoredMealDoc, role: string | null): boolean => {
  if (!role) return false;
  if (typeof meal.ownerUid === "string" && meal.ownerUid) return false;

  if (Array.isArray(meal.userIds)) {
    return meal.userIds.some((participant) => participant === role);
  }

  return typeof meal.userId === "string" && meal.userId === role;
};

const getStorageBucketName = (): string | null => {
  const bucket = serverEnv.storageBucket?.trim();
  return bucket && bucket.length > 0 ? bucket : null;
};

const getStorageObjectPathFromUrl = (imageUrl: string): string | null => {
  const bucketName = getStorageBucketName();
  if (!bucketName) return null;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname !== "firebasestorage.googleapis.com") {
      return null;
    }

    const expectedPrefix = `/v0/b/${bucketName}/o/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      return null;
    }

    const encodedPath = parsed.pathname.slice(expectedPrefix.length);
    if (!encodedPath) return null;
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
};

export const deleteStorageObjectByUrl = async (imageUrl: unknown): Promise<void> => {
  if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) return;

  const bucketName = getStorageBucketName();
  const objectPath = getStorageObjectPathFromUrl(imageUrl);
  if (!bucketName || !objectPath) return;

  await adminStorage.bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true });
};

export const createMealDocument = async ({
  uid,
  actorRole,
  input,
}: {
  uid: string;
  actorRole: UserRole;
  input: CreateMealInput;
}): Promise<Meal> => {
  const userIds = normalizeMealParticipants(input.userIds);
  if (!userIds.includes(actorRole)) {
    throw new MealRouteError("Meal participants must include your role", 403);
  }

  const description = normalizeMealDescription(input.description);
  const type = normalizeMealType(input.type);
  const imageUrl = normalizeImageUrl(input.imageUrl);
  const timestampMillis = getTimestampMillis(input.timestamp);

  const payload = {
    ownerUid: uid,
    userIds,
    description,
    type,
    imageUrl,
    timestamp: Timestamp.fromMillis(timestampMillis),
    commentCount: 0,
    reactions: {},
    keywords: buildMealKeywords({
      description,
      type,
      userIds,
      userId: undefined,
    }),
  };

  const createdRef = await adminDb.collection("meals").add(payload);
  return serializeMealDocument(createdRef.id, payload);
};

export const updateMealDocument = async ({
  mealId,
  uid,
  role,
  input,
}: {
  mealId: string;
  uid: string;
  role: string | null;
  input: UpdateMealInput;
}): Promise<Meal> => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  let staleImageUrl: string | undefined;

  const updatedMeal = await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(mealRef);
    if (!snapshot.exists) {
      throw new MealRouteError("Meal not found", 404);
    }

    const current = snapshot.data() as StoredMealDoc;
    const isOwner = typeof current.ownerUid === "string" && current.ownerUid === uid;
    const legacyAllowed = isLegacyParticipant(current, role);
    if (!isOwner && !legacyAllowed) {
      throw new MealRouteError("Not allowed", 403);
    }

    const dataToUpdate: Record<string, unknown> = {};
    let nextDescription =
      typeof current.description === "string" ? current.description : "";
    let nextType =
      isMealType(current.type)
        ? current.type
        : "점심";
    let nextUserIds = Array.isArray(current.userIds)
      ? current.userIds.filter((value): value is UserRole => isUserRole(value))
      : [];
    let nextImageUrl = typeof current.imageUrl === "string" ? current.imageUrl : undefined;
    let nextOwnerUid = typeof current.ownerUid === "string" ? current.ownerUid : undefined;

    if ("ownerUid" in input && input.ownerUid !== undefined) {
      if (typeof input.ownerUid !== "string" || input.ownerUid !== uid) {
        throw new MealRouteError("Invalid ownerUid", 400);
      }
      if (nextOwnerUid && nextOwnerUid !== uid) {
        throw new MealRouteError("Not allowed", 403);
      }
      nextOwnerUid = uid;
      dataToUpdate.ownerUid = uid;
    }

    if ("description" in input && input.description !== undefined) {
      nextDescription = normalizeMealDescription(input.description);
      dataToUpdate.description = nextDescription;
    }

    if ("type" in input && input.type !== undefined) {
      nextType = normalizeMealType(input.type);
      dataToUpdate.type = nextType;
    }

    if ("userIds" in input && input.userIds !== undefined) {
      nextUserIds = normalizeMealParticipants(input.userIds);
      dataToUpdate.userIds = nextUserIds;
    }

    if ("imageUrl" in input) {
      if (input.imageUrl == null || (typeof input.imageUrl === "string" && input.imageUrl.trim().length === 0)) {
        if (nextImageUrl) {
          staleImageUrl = nextImageUrl;
        }
        nextImageUrl = undefined;
        dataToUpdate.imageUrl = FieldValue.delete();
      } else {
        const normalizedImageUrl = normalizeImageUrl(input.imageUrl);
        if (nextImageUrl && nextImageUrl !== normalizedImageUrl) {
          staleImageUrl = nextImageUrl;
        }
        nextImageUrl = normalizedImageUrl;
        dataToUpdate.imageUrl = normalizedImageUrl;
      }
    }

    if (
      "description" in input ||
      "type" in input ||
      "userIds" in input
    ) {
      dataToUpdate.keywords = buildMealKeywords({
        description: nextDescription,
        type: nextType,
        userIds: nextUserIds,
        userId: isUserRole(current.userId)
          ? current.userId
          : undefined,
      });
    }

    if (Object.keys(dataToUpdate).length > 0) {
      tx.set(mealRef, dataToUpdate, { merge: true });
    }

    return serializeMealDocument(mealId, {
      ...current,
      ...("description" in dataToUpdate ? { description: nextDescription } : {}),
      ...("type" in dataToUpdate ? { type: nextType } : {}),
      ...("userIds" in dataToUpdate ? { userIds: nextUserIds } : {}),
      ...("imageUrl" in input ? { imageUrl: nextImageUrl } : {}),
      ...("ownerUid" in dataToUpdate ? { ownerUid: nextOwnerUid } : {}),
      ...("keywords" in dataToUpdate
        ? {
            keywords: buildMealKeywords({
              description: nextDescription,
              type: nextType,
              userIds: nextUserIds,
              userId: isUserRole(current.userId)
                ? current.userId
                : undefined,
            }),
          }
        : {}),
    });
  });

  if (staleImageUrl) {
    try {
      await deleteStorageObjectByUrl(staleImageUrl);
    } catch (error) {
      console.error("Failed to delete stale meal image", error);
    }
  }

  return updatedMeal;
};
