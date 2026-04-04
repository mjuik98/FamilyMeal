import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { isMealType, isUserRole } from "@/lib/domain/meal-policy";
import { adminDb } from "@/lib/firebase-admin";
import { logError } from "@/lib/logging";
import { isOwnedMealImageUrl } from "@/lib/server/meals/meal-image-url";
import { deleteStorageObjectByUrl } from "@/lib/server/meals/meal-storage";
import {
  buildMealKeywords,
  getTimestampMillis,
  MealRouteError,
  normalizeImageUrl,
  normalizeMealDescription,
  normalizeMealParticipants,
  normalizeMealType,
  serializeMealDocument,
} from "@/lib/server/meals/meal-types";
import type { CreateMealInput, StoredMealDoc, UpdateMealInput } from "@/lib/server/meals/meal-types";
import type { Meal, UserRole } from "@/lib/types";

const DELETE_JOB_TTL_MS = 5 * 60_000;
const DELETE_BATCH_LIMIT = 450;
const DELETE_JOB_COLLECTION = "_maintenanceDeleteJobs";

type DeleteJobDoc = {
  status?: unknown;
  startedAt?: unknown;
  deletedAt?: unknown;
  attempts?: unknown;
};

export type MealDeletePlan =
  | { action: "already_deleted" }
  | { action: "wait_for_inflight" }
  | { action: "delete_now"; mealImageUrl?: string };

const normalizeOwnedMealImageUrl = (imageUrl: unknown, uid: string): string => {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);
  if (!isOwnedMealImageUrl(normalizedImageUrl, uid)) {
    throw new MealRouteError("Invalid meal image URL", 400);
  }

  return normalizedImageUrl;
};

const toMillis = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
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

    if ("imageUrl" in input) {
      if (input.imageUrl == null || (typeof input.imageUrl === "string" && input.imageUrl.trim().length === 0)) {
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

export const planMealDeleteOperation = async (
  mealId: string,
  uid: string
): Promise<MealDeletePlan> => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  const jobRef = adminDb.collection(DELETE_JOB_COLLECTION).doc(mealId);

  return adminDb.runTransaction(async (tx) => {
    const [mealSnap, jobSnap] = await Promise.all([tx.get(mealRef), tx.get(jobRef)]);
    const now = Date.now();

    if (!mealSnap.exists) {
      return { action: "already_deleted" } satisfies MealDeletePlan;
    }

    const meal = mealSnap.data() as StoredMealDoc;
    if (typeof meal.ownerUid !== "string" || meal.ownerUid.trim().length === 0) {
      throw new MealRouteError("Legacy meals must be migrated before mutation", 409);
    }
    const isOwner = typeof meal.ownerUid === "string" && meal.ownerUid === uid;
    if (!isOwner) {
      throw new MealRouteError("Not allowed", 403);
    }

    const existingJob = (jobSnap.data() ?? {}) as DeleteJobDoc;
    const status = typeof existingJob.status === "string" ? existingJob.status : "";
    const startedAt = toMillis(existingJob.startedAt);
    const isInflight =
      status === "processing" &&
      typeof startedAt === "number" &&
      now - startedAt < DELETE_JOB_TTL_MS;

    if (isInflight) {
      return { action: "wait_for_inflight" } satisfies MealDeletePlan;
    }

    const attempts =
      typeof existingJob.attempts === "number" && Number.isFinite(existingJob.attempts)
        ? Math.max(0, Math.floor(existingJob.attempts))
        : 0;

    tx.set(
      jobRef,
      {
        status: "processing",
        startedAt: now,
        updatedAt: now,
        requestedBy: uid,
        attempts: attempts + 1,
      },
      { merge: true }
    );

    return {
      action: "delete_now",
      mealImageUrl: typeof meal.imageUrl === "string" ? meal.imageUrl : undefined,
    } satisfies MealDeletePlan;
  });
};

export const deleteMealCommentsByMealId = async (mealId: string): Promise<void> => {
  const commentsRef = adminDb.collection("meals").doc(mealId).collection("comments");
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let q: FirebaseFirestore.Query = commentsRef.orderBy("__name__").limit(DELETE_BATCH_LIMIT);
    if (cursor) {
      q = commentsRef.orderBy("__name__").startAfter(cursor).limit(DELETE_BATCH_LIMIT);
    }

    const snapshot: FirebaseFirestore.QuerySnapshot = await q.get();
    if (snapshot.empty) return;

    const batch = adminDb.batch();
    snapshot.docs.forEach((commentDoc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(commentDoc.ref));
    await batch.commit();

    if (snapshot.size < DELETE_BATCH_LIMIT) return;
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor) return;
  }
};

export const deleteMealDocumentById = async (mealId: string): Promise<void> => {
  await adminDb.collection("meals").doc(mealId).delete();
};

export const markMealDeleteJob = async (mealId: string, payload: Record<string, unknown>) => {
  const jobRef = adminDb.collection(DELETE_JOB_COLLECTION).doc(mealId);
  await jobRef.set(
    {
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};
