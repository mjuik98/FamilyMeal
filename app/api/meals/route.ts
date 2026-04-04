import { NextResponse } from "next/server";
import { z } from "zod";

import { parseDateKey } from "@/lib/date-utils";
import {
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { createMealDocument, listMealsForDate } from "@/lib/server/meals/meal-use-cases";
import { deleteStorageObjectByUrl } from "@/lib/server/meals/meal-storage";
import { requireValidatedUserRole } from "@/lib/server/route-auth";
import { MealRouteError } from "@/lib/server/meals/meal-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MealCreateSchema = z.object({
  userIds: z.array(z.enum(USER_ROLES)).min(1),
  description: z.string().trim().min(1).max(MAX_MEAL_DESCRIPTION_LENGTH),
  type: z.enum(VALID_MEAL_TYPES),
  imageUrl: z.string().trim().url().max(MAX_MEAL_IMAGE_URL_LENGTH),
  timestamp: z.number().int().positive().optional(),
});

export async function GET(request: Request) {
  try {
    const { role } = await requireValidatedUserRole(request);
    const date = parseDateKey(new URL(request.url).searchParams.get("date"));
    if (!date) {
      throw new RouteError("Invalid meal date", 400);
    }

    const meals = await listMealsForDate({
      actorRole: role,
      date,
    });
    return NextResponse.json({ ok: true, meals });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}

export async function POST(request: Request) {
  let uid: string | null = null;
  let uploadedImageUrl: string | null = null;

  try {
    const { user, role } = await requireValidatedUserRole(request);
    uid = user.uid;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new MealRouteError("Invalid JSON body", 400);
    }

    const parsed = MealCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new MealRouteError("Invalid payload", 400);
    }
    uploadedImageUrl = parsed.data.imageUrl;

    const meal = await createMealDocument({
      uid: user.uid,
      actorRole: role,
      input: parsed.data,
    });

    return NextResponse.json({ ok: true, meal }, { status: 201 });
  } catch (error) {
    if (uid && uploadedImageUrl) {
      try {
        await deleteStorageObjectByUrl(uploadedImageUrl, { uid });
      } catch (cleanupError) {
        logError("Failed to cleanup uploaded meal image after create error", cleanupError);
      }
    }

    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
