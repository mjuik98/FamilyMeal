import { z } from "zod";

import { RouteError } from "@/lib/platform/http/route-errors";

export type RequestBodyErrorFactory = (message: string, status?: number) => Error;

type ParseJsonBodyOptions<T> = {
  schema?: z.ZodType<T>;
  createError?: RequestBodyErrorFactory;
  invalidJsonMessage?: string;
  invalidPayloadMessage?: string;
};

const defaultCreateError: RequestBodyErrorFactory = (message, status = 400) =>
  new RouteError(message, status);

export const parseJsonBody = async <T = unknown>(
  request: Request,
  options: ParseJsonBodyOptions<T> = {}
): Promise<T> => {
  const {
    schema,
    createError = defaultCreateError,
    invalidJsonMessage = "Invalid JSON body",
    invalidPayloadMessage = "Invalid payload",
  } = options;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw createError(invalidJsonMessage, 400);
  }

  if (!schema) {
    return body as T;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw createError(invalidPayloadMessage, 400);
  }

  return parsed.data;
};
