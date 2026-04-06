import { NextResponse } from "next/server";

import { logError } from "@/lib/logging";
import { reportErrorToObservability } from "@/lib/platform/observability/error-reporter";
import {
  getRouteErrorMessage,
  getRouteErrorCode,
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
    const status = getRouteErrorStatus(error);
    if (status >= 500) {
      logError("Unhandled route error", error, {
        status,
        message: getRouteErrorMessage(error),
      });
      void reportErrorToObservability({
        source: "route-handler",
        code: getRouteErrorCode(error),
        message: getRouteErrorMessage(error),
        error,
        context: { status },
      });
    }

    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status }
    );
  }
};
