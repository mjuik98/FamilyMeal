import { NextResponse } from "next/server";

import { getRouteErrorMessage, getRouteErrorStatus } from "@/lib/route-errors";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";
import {
  getMealId,
  parseCommentCreatePayload,
} from "@/lib/server/comments/comment-policy";
import {
  assertValidCommentRole,
  createMealComment,
} from "@/lib/server/comments/comment-use-cases";

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
    const user = await verifyRequestUser(request);
    const mealId = await getMealId(context.params);
    const actorRole = assertValidCommentRole(await getUserRole(user.uid));
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
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
