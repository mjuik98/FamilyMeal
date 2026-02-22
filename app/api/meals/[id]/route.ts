import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";

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
  | { action: "delete_now" };

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

const getErrorStatus = (error: unknown): number =>
  error instanceof AuthError
    ? error.status
    : error instanceof RouteError
      ? error.status
      : 500;

const getErrorMessage = (error: unknown): string =>
  error instanceof AuthError || error instanceof RouteError ? error.message : "internal error";

const decodeMealId = async (params: Promise<Params>): Promise<string> => {
  const { id } = await params;
  let mealId = "";
  try {
    mealId = decodeURIComponent(id || "").trim();
  } catch {
    throw new RouteError("Invalid meal id", 400);
  }
  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
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

const isLegacyParticipant = (meal: MealDoc, role: string | null): boolean => {
  if (!role) return false;
  if (typeof meal.ownerUid === "string" && meal.ownerUid) return false;

  if (Array.isArray(meal.userIds)) {
    return meal.userIds.some((participant) => participant === role);
  }

  return typeof meal.userId === "string" && meal.userId === role;
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
      throw new RouteError("Not allowed", 403);
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

    return { action: "delete_now" } satisfies DeletePlan;
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
  try {
    const user = await verifyRequestUser(request);
    const mealId = await decodeMealId(context.params);
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
    await markDeleteJob(mealId, {
      status: "completed",
      deletedAt: Date.now(),
      completedBy: user.uid,
    });

    return NextResponse.json({ ok: true, deleted: true, status: "completed" });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);

    if (!(error instanceof AuthError)) {
      try {
        const mealId = await decodeMealId(context.params);
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
