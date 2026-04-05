import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireValidatedUserRole } from "@/lib/platform/auth/route-auth";
import { RouteError } from "@/lib/platform/http/route-errors";
import { parseArchiveQueryParams } from "@/lib/modules/meals/server/archive-types";
import { listArchiveMeals } from "@/lib/modules/meals/server/archive-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
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
    return { ok: true, ...result };
  });
}
