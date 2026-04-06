import { z } from "zod";

import { parseDateKey } from "@/lib/date-utils";
import {
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import { parseJsonBody } from "@/lib/platform/http/request-body";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { RouteError } from "@/lib/platform/http/route-errors";
import { listMealsForDate } from "@/lib/modules/meals/server/meal-read-use-cases";
import { deleteStorageObjectByUrl } from "@/lib/modules/meals/server/meal-storage";
import { createMealDocument } from "@/lib/modules/meals/server/meal-write-use-cases";
import { MealRouteError } from "@/lib/modules/meals/server/meal-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMealRouteError = (message: string, status = 400) =>
  new MealRouteError(message, status);

const MealCreateSchema = z.object({
  userIds: z.array(z.enum(USER_ROLES)).min(1),
  description: z.string().trim().min(1).max(MAX_MEAL_DESCRIPTION_LENGTH),
  type: z.enum(VALID_MEAL_TYPES),
  imageUrl: z.string().trim().url().max(MAX_MEAL_IMAGE_URL_LENGTH),
  timestamp: z.number().int().positive().optional(),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { role } = await requireValidatedUserRole(request);
    const date = parseDateKey(new URL(request.url).searchParams.get("date"));
    if (!date) {
      throw new RouteError("Invalid meal date", 400);
    }

    const meals = await listMealsForDate({
      actorRole: role,
      date,
    });

    return { ok: true, meals };
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    let uid: string | null = null;
    let uploadedImageUrl: string | null = null;

    try {
      const { user, role } = await requireValidatedUserRole(request);
      uid = user.uid;

      const input = await parseJsonBody(request, {
        schema: MealCreateSchema,
        createError: createMealRouteError,
      });
      uploadedImageUrl = input.imageUrl;

      const meal = await createMealDocument({
        uid: user.uid,
        actorRole: role,
        input,
      });

      return Response.json({ ok: true, meal }, { status: 201 });
    } catch (error) {
      if (uid && uploadedImageUrl) {
        try {
          await deleteStorageObjectByUrl(uploadedImageUrl, { uid });
        } catch (cleanupError) {
          logError("Failed to cleanup uploaded meal image after create error", cleanupError);
        }
      }

      throw error;
    }
  });
}
