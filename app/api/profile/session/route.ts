import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { loadUserProfileSession } from "@/lib/modules/profile/server/profile-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);
    const profile = await loadUserProfileSession({ user });
    return { ok: true, profile };
  });
}
