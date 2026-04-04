import { NextResponse } from "next/server";

import { getRouteErrorPayload, getRouteErrorStatus } from "@/lib/route-errors";
import {
  getCommentRouteParams,
  parseCommentUpdatePayload,
} from "@/lib/server/comments/comment-policy";
import {
  deleteMealCommentById,
  updateMealCommentById,
} from "@/lib/server/comments/comment-use-cases";
import { requireVerifiedUser } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
  commentId: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await requireVerifiedUser(request);
    const { mealId, commentId } = await getCommentRouteParams(context.params);
    const { text } = await parseCommentUpdatePayload(request);

    const comment = await updateMealCommentById({
      mealId,
      commentId,
      uid: user.uid,
      text,
    });

    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await requireVerifiedUser(request);
    const { mealId, commentId } = await getCommentRouteParams(context.params);

    await deleteMealCommentById({
      mealId,
      commentId,
      uid: user.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
