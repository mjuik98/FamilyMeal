import { NextResponse } from "next/server";

import { getRouteErrorPayload, getRouteErrorStatus } from "@/lib/route-errors";
import {
  getCommentReactionRouteParams,
  parseReactionPayload,
} from "@/lib/server/reactions/reaction-policy";
import {
  assertReactionActorRole,
  toggleCommentReactionForUser,
} from "@/lib/server/reactions/reaction-use-cases";
import { requireValidatedUserRole } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string; commentId: string };

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const { user, role: actorRole } = await requireValidatedUserRole(
      request,
      assertReactionActorRole
    );
    const { mealId, commentId } = await getCommentReactionRouteParams(
      context.params
    );
    const { emoji } = await parseReactionPayload(request);
    const reactions = await toggleCommentReactionForUser({
      mealId,
      commentId,
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
