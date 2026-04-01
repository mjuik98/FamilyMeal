import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { z } from "zod";

import {
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { adminDb } from "@/lib/firebase-admin";
import { getRouteErrorMessage, getRouteErrorStatus } from "@/lib/route-errors";
import {
  deleteStorageObjectByUrl,
  isLegacyParticipant,
  MealRouteError,
  updateMealDocument,
} from "@/lib/server-meals";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";
import type { Meal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DELETE_JOB_TTL_MS = 5 * 60_000;
const DELETE_BATCH_LIMIT = 450;
const DELETE_JOB_COLLECTION = "_maintenanceDeleteJobs";

type Params = {
  id: string;
};

type MealDoc = {
  ownerUid?: unknown;
  userIds?: unknown;
  userId?: unknown;
  imageUrl?: unknown;
};

type DeleteJobDoc = {
  status?: unknown;
  startedAt?: unknown;
  deletedAt?: unknown;
  attempts?: unknown;
};

type DeletePlan =
  | { action: "already_deleted" }
  | { action: "wait_for_inflight" }
  | { action: "delete_now"; mealImageUrl?: string };

const MealUpdateSchema = z.object({
  ownerUid: z.string().trim().min(1).optional(),
  userIds: z.array(z.enum(USER_ROLES)).min(1).optional(),
  description: z.string().trim().min(1).max(MAX_MEAL_DESCRIPTION_LENGTH).optional(),
  type: z.enum(VALID_MEAL_TYPES).optional(),
  imageUrl: z.string().trim().url().max(MAX_MEAL_IMAGE_URL_LENGTH).nullable().optional(),
});

const decodeMealId = async (params: Promise<Params>): Promise<string> => {
  const { id } = await params;
  let mealId = "";
  try {
    mealId = decodeURIComponent(id || "").trim();
  } catch {
    throw new MealRouteError("Invalid meal id", 400);
  }
  if (!mealId) {
    throw new MealRouteError("Invalid meal id", 400);
  }
  return mealId;
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

const planDeleteOperation = async (
  mealId: string,
  uid: string,
  role: string | null
): Promise<DeletePlan> => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  const jobRef = adminDb.collection(DELETE_JOB_COLLECTION).doc(mealId);

  return adminDb.runTransaction(async (tx) => {
    const [mealSnap, jobSnap] = await Promise.all([tx.get(mealRef), tx.get(jobRef)]);
    const now = Date.now();

    if (!mealSnap.exists) {
      return { action: "already_deleted" } satisfies DeletePlan;
    }

    const meal = mealSnap.data() as MealDoc;
    const isOwner = typeof meal.ownerUid === "string" && meal.ownerUid === uid;
    const legacyAllowed = isLegacyParticipant(meal, role);
    if (!isOwner && !legacyAllowed) {
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
      return { action: "wait_for_inflight" } satisfies DeletePlan;
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
    } satisfies DeletePlan;
  });
};

const deleteMealComments = async (mealId: string): Promise<void> => {
  const commentsRef = adminDb.collection("meals").doc(mealId).collection("comments");
  let cursor: QueryDocumentSnapshot | null = null;

  while (true) {
    let q: FirebaseFirestore.Query = commentsRef.orderBy("__name__").limit(DELETE_BATCH_LIMIT);
    if (cursor) {
      q = commentsRef.orderBy("__name__").startAfter(cursor).limit(DELETE_BATCH_LIMIT);
    }

    const snapshot: FirebaseFirestore.QuerySnapshot = await q.get();
    if (snapshot.empty) return;

    const batch = adminDb.batch();
    snapshot.docs.forEach((commentDoc: FirebaseFirestore.QueryDocumentSnapshot) =>
      batch.delete(commentDoc.ref)
    );
    await batch.commit();

    if (snapshot.size < DELETE_BATCH_LIMIT) return;
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor) return;
  }
};

const markDeleteJob = async (mealId: string, payload: Record<string, unknown>) => {
  const jobRef = adminDb.collection(DELETE_JOB_COLLECTION).doc(mealId);
  await jobRef.set(
    {
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  let mealId: string | null = null;

  try {
    const user = await verifyRequestUser(request);
    mealId = await decodeMealId(context.params);
    const role = await getUserRole(user.uid);

    const plan = await planDeleteOperation(mealId, user.uid, role);
    if (plan.action === "already_deleted") {
      return NextResponse.json({ ok: true, deleted: false, status: "already_deleted" });
    }

    if (plan.action === "wait_for_inflight") {
      return NextResponse.json(
        { ok: true, deleted: false, status: "already_processing" },
        { status: 202 }
      );
    }

    await deleteMealComments(mealId);
    await adminDb.collection("meals").doc(mealId).delete();
    if (plan.action === "delete_now" && plan.mealImageUrl) {
      try {
        await deleteStorageObjectByUrl(plan.mealImageUrl);
      } catch (error) {
        console.error("Failed to delete meal image during delete cleanup", error);
      }
    }
    await markDeleteJob(mealId, {
      status: "completed",
      deletedAt: Date.now(),
      completedBy: user.uid,
    });

    return NextResponse.json({ ok: true, deleted: true, status: "completed" });
  } catch (error) {
    const status = getRouteErrorStatus(error);
    const message = getRouteErrorMessage(error);

    if (!(error instanceof AuthError) && mealId) {
      try {
        await markDeleteJob(mealId, {
          status: "failed",
          lastError: message,
        });
      } catch {
        // Ignore secondary failure in best-effort error reporting.
      }
    }

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const mealId = await decodeMealId(context.params);
    const role = await getUserRole(user.uid);
    if (!isUserRole(role)) {
      throw new MealRouteError("Valid user role is required", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new MealRouteError("Invalid JSON body", 400);
    }

    const parsed = MealUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new MealRouteError("Invalid payload", 400);
    }

    const meal = await updateMealDocument({
      mealId,
      uid: user.uid,
      role,
      input: parsed.data as Partial<Omit<Meal, "id">>,
    });

    return NextResponse.json({ ok: true, meal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
