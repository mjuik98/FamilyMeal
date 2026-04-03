import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { publicEnv } from "@/lib/config/public-env";
import { serverEnv } from "@/lib/config/server-env";
import { canAccessQaRoute } from "@/lib/qa-access";

const isQaAllowedInProduction = publicEnv.enableQa;
const qaRouteToken = serverEnv.qaRouteToken;

const notFound = () => new NextResponse("Not Found", { status: 404 });

export function proxy(request: NextRequest) {
  const canAccess = canAccessQaRoute({
    nodeEnv: serverEnv.isProduction ? "production" : "development",
    qaEnabledInProduction: isQaAllowedInProduction,
    qaRouteToken,
    queryToken: request.nextUrl.searchParams.get("qa_token"),
    headerToken: request.headers.get("x-qa-token"),
  });

  if (!canAccess) {
    return notFound();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/qa/:path*"],
};
