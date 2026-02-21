import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canAccessQaRoute } from "@/lib/qa-access";

const isQaAllowedInProduction = process.env.NEXT_PUBLIC_ENABLE_QA === "true";
const qaRouteToken = process.env.QA_ROUTE_TOKEN?.trim() ?? "";

const notFound = () => new NextResponse("Not Found", { status: 404 });

export function proxy(request: NextRequest) {
  const canAccess = canAccessQaRoute({
    nodeEnv: process.env.NODE_ENV,
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
