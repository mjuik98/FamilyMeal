import { adminDb } from "@/lib/firebase-admin";

import {
  MealRouteError,
  type StoredMealDoc,
} from "@/lib/server/meals/meal-types";

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

export const markMealDeleteJob = async (
  mealId: string,
  payload: Record<string, unknown>
) => {
  const jobRef = adminDb.collection(DELETE_JOB_COLLECTION).doc(mealId);
  await jobRef.set(
    {
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};
