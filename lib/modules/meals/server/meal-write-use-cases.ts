import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { isMealType, isUserRole } from "@/lib/domain/meal-policy";
import { adminDb } from "@/lib/firebase-admin";
import { logError } from "@/lib/logging";
import { isOwnedMealImageUrl } from "@/lib/modules/meals/server/meal-image-url";
import { deleteStorageObjectByUrl } from "@/lib/modules/meals/server/meal-storage";
import {
  buildMealKeywords,
  getTimestampMillis,
  MealRouteError,
  normalizeImageUrl,
  normalizeMealDescription,
  normalizeMealParticipants,
  normalizeMealType,
  serializeMealDocument,
} from "@/lib/modules/meals/server/meal-types";
import type {
  CreateMealInput,
  StoredMealDoc,
  UpdateMealInput,
} from "@/lib/modules/meals/server/meal-types";
import type { Meal, UserRole } from "@/lib/types";

const normalizeOwnedMealImageUrl = (imageUrl: unknown, uid: string): string => {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);
  if (!isOwnedMealImageUrl(normalizedImageUrl, uid)) {
    throw new MealRouteError("Invalid meal image URL", 400);
  }

  return normalizedImageUrl;
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
  const imageUrl = normalizeOwnedMealImageUrl(input.imageUrl, uid);
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
  input,
}: {
  mealId: string;
  uid: string;
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
    if (typeof current.ownerUid !== "string" || current.ownerUid.trim().length === 0) {
      throw new MealRouteError("Legacy meals must be migrated before mutation", 409);
    }
    const isOwner = typeof current.ownerUid === "string" && current.ownerUid === uid;
    if (!isOwner) {
      throw new MealRouteError("Not allowed", 403);
    }

    const dataToUpdate: Record<string, unknown> = {};
    let nextDescription = typeof current.description === "string" ? current.description : "";
    let nextType = isMealType(current.type) ? current.type : "점심";
    let nextUserIds = Array.isArray(current.userIds) ? current.userIds.filter(isUserRole) : [];
    let nextImageUrl = typeof current.imageUrl === "string" ? current.imageUrl : undefined;
    let nextOwnerUid = typeof current.ownerUid === "string" ? current.ownerUid : undefined;
    let nextTimestamp = getTimestampMillis(current.timestamp);

    if ("userId" in current) {
      dataToUpdate.userId = FieldValue.delete();
    }

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

    if ("timestamp" in input && input.timestamp !== undefined) {
      nextTimestamp = getTimestampMillis(input.timestamp, nextTimestamp);
      dataToUpdate.timestamp = Timestamp.fromMillis(nextTimestamp);
    }

    if ("imageUrl" in input) {
      if (
        input.imageUrl == null ||
        (typeof input.imageUrl === "string" && input.imageUrl.trim().length === 0)
      ) {
        if (nextImageUrl) {
          staleImageUrl = nextImageUrl;
        }
        nextImageUrl = undefined;
        dataToUpdate.imageUrl = FieldValue.delete();
      } else {
        const normalizedImageUrl = normalizeOwnedMealImageUrl(input.imageUrl, uid);
        if (nextImageUrl && nextImageUrl !== normalizedImageUrl) {
          staleImageUrl = nextImageUrl;
        }
        nextImageUrl = normalizedImageUrl;
        dataToUpdate.imageUrl = normalizedImageUrl;
      }
    }

    if ("description" in input || "type" in input || "userIds" in input) {
      dataToUpdate.keywords = buildMealKeywords({
        description: nextDescription,
        type: nextType,
        userIds: nextUserIds,
        userId: undefined,
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
      ...("timestamp" in dataToUpdate ? { timestamp: nextTimestamp } : {}),
      ...("imageUrl" in input ? { imageUrl: nextImageUrl } : {}),
      ...("ownerUid" in dataToUpdate ? { ownerUid: nextOwnerUid } : {}),
      ...("userId" in dataToUpdate ? { userId: undefined } : {}),
      ...("keywords" in dataToUpdate
        ? {
            keywords: buildMealKeywords({
              description: nextDescription,
              type: nextType,
              userIds: nextUserIds,
              userId: undefined,
            }),
          }
        : {}),
    });
  });

  if (staleImageUrl) {
    try {
      await deleteStorageObjectByUrl(staleImageUrl, { uid });
    } catch (error) {
      logError("Failed to delete stale meal image", error);
    }
  }

  return updatedMeal;
};
