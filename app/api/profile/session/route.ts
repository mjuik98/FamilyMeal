import { NextResponse } from "next/server";

import { getRouteErrorPayload, getRouteErrorStatus } from "@/lib/route-errors";
import { loadUserProfileSession } from "@/lib/server/profile/profile-use-cases";
import { requireVerifiedUser } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedUser(request);
    const profile = await loadUserProfileSession({ user });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
