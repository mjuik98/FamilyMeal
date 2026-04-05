import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import {
  getMealId,
  parseCommentCreatePayload,
} from "@/lib/modules/comments/server/comment-policy";
import {
  assertValidCommentRole,
  createMealComment,
} from "@/lib/modules/comments/server/comment-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
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

    return { ok: true, comment };
  });
}
