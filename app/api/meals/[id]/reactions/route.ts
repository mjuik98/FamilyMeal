import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import {
  getMealReactionMealId,
  parseReactionPayload,
} from "@/lib/modules/reactions/server/reaction-policy";
import {
  assertReactionActorRole,
  toggleMealReactionForUser,
} from "@/lib/modules/reactions/server/reaction-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  return handleRoute(async () => {
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

    return { ok: true, reactions };
  });
}
