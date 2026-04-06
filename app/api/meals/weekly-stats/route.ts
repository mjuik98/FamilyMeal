import { parseDateKey } from "@/lib/date-utils";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { RouteError } from "@/lib/platform/http/route-errors";
import { listWeeklyMealStats } from "@/lib/modules/meals/server/meal-read-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { role } = await requireValidatedUserRole(request);
    const referenceDate = parseDateKey(new URL(request.url).searchParams.get("date"));
    if (!referenceDate) {
      throw new RouteError("Invalid meal date", 400);
    }

    const stats = await listWeeklyMealStats({
      actorRole: role,
      referenceDate,
    });

    return {
      ok: true,
      stats: stats.map((stat) => ({
        ...stat,
        date: stat.date.getTime(),
      })),
    };
  });
}
