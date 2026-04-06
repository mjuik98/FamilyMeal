import { z } from "zod";

import { RouteError } from "@/lib/platform/http/route-errors";

export type RequestBodyErrorFactory = (message: string, status?: number) => Error;

const DEFAULT_MAX_JSON_BODY_BYTES = 64 * 1024;

type ParseJsonBodyOptions<T> = {
  schema?: z.ZodType<T>;
  createError?: RequestBodyErrorFactory;
  invalidJsonMessage?: string;
  invalidPayloadMessage?: string;
  tooLargeMessage?: string;
  maxBytes?: number;
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
    tooLargeMessage = "Request body is too large",
    maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
  } = options;

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createError(tooLargeMessage, 413);
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    throw createError(invalidJsonMessage, 400);
  }

  const bodyBytes = new TextEncoder().encode(raw).length;
  if (bodyBytes > maxBytes) {
    throw createError(tooLargeMessage, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
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
