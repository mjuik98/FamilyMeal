import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { USER_ROLES } from "@/lib/domain/meal-policy";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { parseJsonBody } from "@/lib/platform/http/request-body";
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

    const { role: requestedRole } = await parseJsonBody(request, {
      schema: RoleUpdateSchema,
    });
    const updatedProfile = await saveUserRoleProfile({
      user,
      requestedRole,
      allowRoleReassign,
    });

    return { ok: true, profile: updatedProfile };
  });
}
