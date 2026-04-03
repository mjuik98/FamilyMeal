import { NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { USER_ROLES } from "@/lib/domain/meal-policy";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { saveUserRoleProfile } from "@/lib/server/profile/profile-use-cases";
import { requireVerifiedUser } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowRoleReassign = serverEnv.allowRoleReassign;

const RoleUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
});

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ ok: true, profile: updatedProfile });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
