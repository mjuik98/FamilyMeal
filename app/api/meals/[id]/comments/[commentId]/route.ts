import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import {
  getCommentRouteParams,
  parseCommentUpdatePayload,
} from "@/lib/modules/comments/server/comment-policy";
import {
  deleteMealCommentById,
  updateMealCommentById,
} from "@/lib/modules/comments/server/comment-use-cases";

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
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);
    const { mealId, commentId } = await getCommentRouteParams(context.params);
    const { text } = await parseCommentUpdatePayload(request);

    const comment = await updateMealCommentById({
      mealId,
      commentId,
      uid: user.uid,
      text,
    });

    return { ok: true, comment };
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);
    const { mealId, commentId } = await getCommentRouteParams(context.params);

    await deleteMealCommentById({
      mealId,
      commentId,
      uid: user.uid,
    });

    return { ok: true };
  });
}
