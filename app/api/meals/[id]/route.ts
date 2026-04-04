import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import { getRouteErrorMessage, getRouteErrorStatus } from "@/lib/route-errors";
import {
  deleteMealCommentsByMealId,
  deleteMealDocumentById,
  markMealDeleteJob,
  planMealDeleteOperation,
  updateMealDocument,
} from "@/lib/server/meals/meal-use-cases";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";
import { deleteStorageObjectByUrl } from "@/lib/server/meals/meal-storage";
import { MealRouteError } from "@/lib/server/meals/meal-types";
import type { Meal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

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

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  let mealId: string | null = null;

  try {
    const user = await verifyRequestUser(request);
    mealId = await decodeMealId(context.params);
    await getUserRole(user.uid);

    const plan = await planMealDeleteOperation(mealId, user.uid);
    if (plan.action === "already_deleted") {
      return NextResponse.json({ ok: true, deleted: false, status: "already_deleted" });
    }

    if (plan.action === "wait_for_inflight") {
      return NextResponse.json(
        { ok: true, deleted: false, status: "already_processing" },
        { status: 202 }
      );
    }

    await deleteMealCommentsByMealId(mealId);
    await deleteMealDocumentById(mealId);
    if (plan.action === "delete_now" && plan.mealImageUrl) {
      try {
        await deleteStorageObjectByUrl(plan.mealImageUrl, { uid: user.uid });
      } catch (error) {
        logError("Failed to delete meal image during delete cleanup", error);
      }
    }
    await markMealDeleteJob(mealId, {
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
        await markMealDeleteJob(mealId, {
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
