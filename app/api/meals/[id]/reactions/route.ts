import { NextResponse } from "next/server";

import { getRouteErrorPayload, getRouteErrorStatus } from "@/lib/route-errors";
import {
  getMealReactionMealId,
  parseReactionPayload,
} from "@/lib/server/reactions/reaction-policy";
import {
  assertReactionActorRole,
  toggleMealReactionForUser,
} from "@/lib/server/reactions/reaction-use-cases";
import { requireValidatedUserRole } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const { user, role: actorRole } = await requireValidatedUserRole(
      request,
      assertReactionActorRole
    );
    const mealId = await getMealReactionMealId(context.params);
    const { emoji } = await parseReactionPayload(request);
    const reactions = await toggleMealReactionForUser({
      mealId,
      uid: user.uid,
      actorRole,
      emoji,
    });

    return NextResponse.json({ ok: true, reactions });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
