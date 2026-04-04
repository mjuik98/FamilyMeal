import { NextResponse } from "next/server";

import { parseDateKey } from "@/lib/date-utils";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { listWeeklyMealStats } from "@/lib/server/meals/meal-use-cases";
import { requireValidatedUserRole } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { role } = await requireValidatedUserRole(request);
    const referenceDate = parseDateKey(new URL(request.url).searchParams.get("date"));
    if (!referenceDate) {
      throw new RouteError("Invalid meal date", 400);
    }

    const stats = await listWeeklyMealStats({
      actorRole: role,
      referenceDate,
    });

    return NextResponse.json({
      ok: true,
      stats: stats.map((stat) => ({
        ...stat,
        date: stat.date.getTime(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
