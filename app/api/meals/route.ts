import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isUserRole,
  MAX_MEAL_DESCRIPTION_LENGTH,
  MAX_MEAL_IMAGE_URL_LENGTH,
  USER_ROLES,
  VALID_MEAL_TYPES,
} from "@/lib/domain/meal-policy";
import { getRouteErrorMessage, getRouteErrorStatus } from "@/lib/route-errors";
import { createMealDocument, MealRouteError } from "@/lib/server-meals";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MealCreateSchema = z.object({
  userIds: z.array(z.enum(USER_ROLES)).min(1),
  description: z.string().trim().min(1).max(MAX_MEAL_DESCRIPTION_LENGTH),
  type: z.enum(VALID_MEAL_TYPES),
  imageUrl: z.string().trim().url().max(MAX_MEAL_IMAGE_URL_LENGTH),
  timestamp: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await verifyRequestUser(request);
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

    const parsed = MealCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new MealRouteError("Invalid payload", 400);
    }

    const meal = await createMealDocument({
      uid: user.uid,
      actorRole: role,
      input: parsed.data,
    });

    return NextResponse.json({ ok: true, meal }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
