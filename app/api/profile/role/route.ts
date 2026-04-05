import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { USER_ROLES } from "@/lib/domain/meal-policy";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { RouteError } from "@/lib/platform/http/route-errors";
import { saveUserRoleProfile } from "@/lib/modules/profile/server/profile-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowRoleReassign = serverEnv.allowRoleReassign;

const RoleUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }

    const parsed = RoleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const requestedRole = parsed.data.role;
    const updatedProfile = await saveUserRoleProfile({
      user,
      requestedRole,
      allowRoleReassign,
    });

    return { ok: true, profile: updatedProfile };
  });
}
