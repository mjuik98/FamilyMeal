import {
  getErrorCode,
  getErrorMessage,
  normalizeErrorCode,
} from "@/lib/platform/errors/error-contract";

type ErrorWithStatus = Error & { status: number };
type ErrorWithCode = Error & { code: string };

export type RouteErrorPayload = {
  code: string;
  message: string;
};

const hasStatus = (error: unknown): error is ErrorWithStatus =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as { status?: unknown }).status === "number";

const hasCode = (error: unknown): error is ErrorWithCode =>
  error instanceof Error &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string" &&
  (error as { code: string }).code.trim().length > 0;

export class RouteError extends Error {
  code: string;
  status: number;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "RouteError";
    this.code =
      code ??
      normalizeErrorCode(message, status >= 500 ? "internal_error" : "bad_request");
    this.status = status;
  }
}

export const getRouteErrorStatus = (error: unknown): number =>
  hasStatus(error) ? error.status : 500;

export const getRouteErrorMessage = (error: unknown): string =>
  getErrorMessage(error) || "internal error";

export const getRouteErrorCode = (error: unknown): string =>
  (!hasCode(error) && getRouteErrorStatus(error) >= 500
    ? "internal_error"
    : getErrorCode(error)) ??
  normalizeErrorCode(
    getRouteErrorMessage(error),
    getRouteErrorStatus(error) >= 500 ? "internal_error" : "request_failed"
  );

export const getRouteErrorPayload = (error: unknown): RouteErrorPayload => ({
  code: getRouteErrorCode(error),
  message: getRouteErrorMessage(error),
});
