import { NextResponse } from "next/server";
import { z } from "zod";

import { getRouteErrorMessage, getRouteErrorStatus } from "@/lib/route-errors";
import { createMealDocument, MealRouteError } from "@/lib/server-meals";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["아빠", "엄마", "딸", "아들"] as const;
const VALID_MEAL_TYPES = ["아침", "점심", "저녁", "간식"] as const;

const MealCreateSchema = z.object({
  userIds: z.array(z.enum(VALID_ROLES)).min(1),
  description: z.string().trim().min(1).max(300),
  type: z.enum(VALID_MEAL_TYPES),
  imageUrl: z.string().trim().url().max(2048),
  timestamp: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await verifyRequestUser(request);
    const role = await getUserRole(user.uid);
    if (!role || !VALID_ROLES.includes(role as UserRole)) {
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
      actorRole: role as UserRole,
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
