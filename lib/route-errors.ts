type ErrorWithStatus = Error & { status: number };

const hasStatus = (error: unknown): error is ErrorWithStatus =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as { status?: unknown }).status === "number";

export class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

export const getRouteErrorStatus = (error: unknown): number =>
  hasStatus(error) ? error.status : 500;

export const getRouteErrorMessage = (error: unknown): string =>
  hasStatus(error) ? error.message : "internal error";
