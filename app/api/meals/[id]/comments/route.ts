import { NextResponse } from "next/server";

import { getRouteErrorPayload, getRouteErrorStatus } from "@/lib/route-errors";
import {
  getMealId,
  parseCommentCreatePayload,
} from "@/lib/server/comments/comment-policy";
import {
  assertValidCommentRole,
  createMealComment,
} from "@/lib/server/comments/comment-use-cases";
import { requireValidatedUserRole } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const { user, role: actorRole } = await requireValidatedUserRole(
      request,
      assertValidCommentRole
    );
    const mealId = await getMealId(context.params);
    const { text, parentId } = await parseCommentCreatePayload(request);

    const comment = await createMealComment({
      mealId,
      uid: user.uid,
      actorRole,
      text,
      parentId,
    });

    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
