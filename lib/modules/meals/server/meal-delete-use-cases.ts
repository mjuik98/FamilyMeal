import {
  deleteStoredMealActivitiesByMealId,
  deleteStoredMealCommentsByMealId,
  deleteStoredMealDocumentById,
  runMealDeletePlanningTransaction,
  updateMealDeleteJob,
} from "@/lib/modules/meals/adapters/firestore/meal-delete-store";
import {
  MealRouteError,
  type StoredMealDoc,
} from "@/lib/modules/meals/server/meal-types";

const DELETE_JOB_TTL_MS = 5 * 60_000;

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
  return runMealDeletePlanningTransaction(mealId, async ({ tx, jobRef, mealSnap, jobSnap }) => {
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

export const deleteMealCommentsByMealId = deleteStoredMealCommentsByMealId;

export const deleteMealActivitiesByMealId = deleteStoredMealActivitiesByMealId;

export const deleteMealDocumentById = deleteStoredMealDocumentById;

export const markMealDeleteJob = async (
  mealId: string,
  payload: Record<string, unknown>
) => updateMealDeleteJob(mealId, payload);
