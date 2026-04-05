import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import {
  getCommentReactionRouteParams,
  parseReactionPayload,
} from "@/lib/modules/reactions/server/reaction-policy";
import {
  assertReactionActorRole,
  toggleCommentReactionForUser,
} from "@/lib/modules/reactions/server/reaction-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string; commentId: string };

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
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

    return { ok: true, reactions };
  });
}
