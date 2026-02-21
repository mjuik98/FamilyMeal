import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isQaAllowedInProduction = process.env.NEXT_PUBLIC_ENABLE_QA === "true";
const qaRouteToken = process.env.QA_ROUTE_TOKEN?.trim() ?? "";

const notFound = () => new NextResponse("Not Found", { status: 404 });

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (!isQaAllowedInProduction) {
    return notFound();
  }

  if (!qaRouteToken) {
    return NextResponse.next();
  }

  const queryToken = request.nextUrl.searchParams.get("qa_token");
  const headerToken = request.headers.get("x-qa-token");

  if (queryToken !== qaRouteToken && headerToken !== qaRouteToken) {
    return notFound();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/qa/:path*"],
};
