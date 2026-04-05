import { NextResponse } from "next/server";

import {
  getRouteErrorPayload,
  getRouteErrorStatus,
} from "@/lib/platform/http/route-errors";

type RouteResult = Response | Record<string, unknown>;

const isResponse = (value: unknown): value is Response => value instanceof Response;

export const handleRoute = async (
  handler: () => RouteResult | Promise<RouteResult>
): Promise<Response> => {
  try {
    const result = await handler();
    if (isResponse(result)) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
};
