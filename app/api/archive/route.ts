import { NextResponse } from "next/server";

import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { parseArchiveQueryParams } from "@/lib/server/meals/archive-types";
import { listArchiveMeals } from "@/lib/server/meals/archive-use-cases";
import { requireValidatedUserRole } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, role } = await requireValidatedUserRole(request);

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
