import { NextResponse } from "next/server";

import { isUserRole } from "@/lib/domain/meal-policy";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";
import { parseArchiveQueryParams } from "@/lib/server/meals/archive-types";
import { listArchiveMeals } from "@/lib/server/meals/archive-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await verifyRequestUser(request);
    const role = await getUserRole(user.uid);
    if (!isUserRole(role)) {
      throw new RouteError("Valid user role is required", 403);
    }

    let query;
    try {
      query = parseArchiveQueryParams(new URL(request.url).searchParams);
    } catch (error) {
      throw new RouteError(
        error instanceof Error && error.message === "Invalid archive cursor"
          ? "Invalid archive cursor"
          : "Invalid archive query",
        400
      );
    }

    const result = await listArchiveMeals({
      ...query,
      uid: user.uid,
      actorRole: role,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
