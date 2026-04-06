import { z } from "zod";

import {
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import { AuthError } from "@/lib/platform/auth/server-auth";
import { parseJsonBody } from "@/lib/platform/http/request-body";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { getRouteErrorMessage } from "@/lib/platform/http/route-errors";
import {
  deleteMealCommentsByMealId,
  deleteMealDocumentById,
  markMealDeleteJob,
  planMealDeleteOperation,
} from "@/lib/modules/meals/server/meal-delete-use-cases";
import { getMealByIdForActor } from "@/lib/modules/meals/server/meal-read-use-cases";
import { deleteStorageObjectByUrl } from "@/lib/modules/meals/server/meal-storage";
import { MealRouteError, type UpdateMealInput } from "@/lib/modules/meals/server/meal-types";
import { updateMealDocument } from "@/lib/modules/meals/server/meal-write-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMealRouteError = (message: string, status = 400) =>
  new MealRouteError(message, status);

type Params = {
  id: string;
};

const MealUpdateSchema = z.object({
  ownerUid: z.string().trim().min(1).optional(),
  userIds: z.array(z.enum(USER_ROLES)).min(1).optional(),
  description: z.string().trim().min(1).max(MAX_MEAL_DESCRIPTION_LENGTH).optional(),
  type: z.enum(VALID_MEAL_TYPES).optional(),
  imageUrl: z.string().trim().url().max(MAX_MEAL_IMAGE_URL_LENGTH).nullable().optional(),
  timestamp: z.number().int().positive().optional(),
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

export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
    const { role } = await requireValidatedUserRole(request);
    const mealId = await decodeMealId(context.params);
    const meal = await getMealByIdForActor({
      mealId,
      actorRole: role,
    });

    return { ok: true, meal };
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
    let mealId: string | null = null;

    try {
      const { user } = await requireValidatedUserRole(request);
      mealId = await decodeMealId(context.params);

      const plan = await planMealDeleteOperation(mealId, user.uid);
      if (plan.action === "already_deleted") {
        return { ok: true, deleted: false, status: "already_deleted" };
      }

      if (plan.action === "wait_for_inflight") {
        return Response.json(
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

      return { ok: true, deleted: true, status: "completed" };
    } catch (error) {
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

      throw error;
    }
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
    const { user, role } = await requireValidatedUserRole(request);
    const mealId = await decodeMealId(context.params);
    if (!isUserRole(role)) {
      throw new MealRouteError("Valid user role is required", 403);
    }

    const input = await parseJsonBody(request, {
      schema: MealUpdateSchema,
      createError: createMealRouteError,
    });

    const meal = await updateMealDocument({
      mealId,
      uid: user.uid,
      input: input as UpdateMealInput,
    });

    return { ok: true, meal };
  });
}
