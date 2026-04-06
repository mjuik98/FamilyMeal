import { createHash } from "node:crypto";

import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { logError } from "@/lib/logging";
import { reportErrorToObservability } from "@/lib/platform/observability/error-reporter";
import { RouteError } from "@/lib/platform/http/route-errors";

const MAX_REQUEST_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_KEY_PREFIX = "client-error";

type RateBucket = {
  count: number;
  windowStart: number;
};

type UpstashLimiter = {
  limit: (key: string) => Promise<{ success: boolean }>;
};

type ClientErrorPayload = z.infer<typeof ClientErrorSchema>;

const ClientErrorSchema = z.object({
  type: z.string().trim().min(1).max(64),
  message: z.string().trim().min(1).max(1000),
  stack: z.string().trim().max(8000).optional(),
  source: z.string().trim().max(500).optional(),
  lineno: z.number().int().min(0).max(1_000_000).optional(),
  colno: z.number().int().min(0).max(1_000_000).optional(),
  url: z.string().trim().max(2048).optional(),
  userAgent: z.string().trim().max(1000).optional(),
  timestamp: z.string().trim().max(100).optional(),
});

const inMemoryBuckets = new Map<string, RateBucket>();

const upstashUrl = serverEnv.upstash.url;
const upstashToken = serverEnv.upstash.token;
const hasUpstash = Boolean(upstashUrl && upstashToken);

let upstashLimiterPromise: Promise<UpstashLimiter | null> | null = null;

const getUpstashLimiter = async (): Promise<UpstashLimiter | null> => {
  if (!hasUpstash) {
    return null;
  }

  if (!upstashLimiterPromise) {
    upstashLimiterPromise = (async () => {
      const [{ Ratelimit }, { Redis }] = await Promise.all([
        import("@upstash/ratelimit"),
        import("@upstash/redis"),
      ]);

      return new Ratelimit({
        redis: new Redis({
          url: upstashUrl as string,
          token: upstashToken as string,
        }),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, "1 m"),
        analytics: true,
        prefix: RATE_LIMIT_KEY_PREFIX,
      });
    })();
  }

  return upstashLimiterPromise;
};

const parseForwardedIp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const [first] = value.split(",");
  const candidate = first?.trim();
  return candidate || null;
};

const buildAnonymousClientKey = (request: Request): string => {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        userAgent: request.headers.get("user-agent") ?? "",
        acceptLanguage: request.headers.get("accept-language") ?? "",
        secChUa: request.headers.get("sec-ch-ua") ?? "",
        secChUaPlatform: request.headers.get("sec-ch-ua-platform") ?? "",
        origin: request.headers.get("origin") ?? "",
        host: request.headers.get("host") ?? "",
      })
    )
    .digest("hex")
    .slice(0, 24);

  return `anonymous:${fingerprint}`;
};

const getClientKey = (request: Request): string => {
  const vercelForwarded = parseForwardedIp(request.headers.get("x-vercel-forwarded-for"));
  if (vercelForwarded) {
    return vercelForwarded;
  }

  return buildAnonymousClientKey(request);
};

const trimMemoryBuckets = () => {
  if (inMemoryBuckets.size < 2000) {
    return;
  }

  const now = Date.now();
  for (const [key, bucket] of inMemoryBuckets.entries()) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
      inMemoryBuckets.delete(key);
    }
  }
};

const isMemoryRateLimited = (clientKey: string): boolean => {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(clientKey);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    inMemoryBuckets.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
};

const isRateLimited = async (clientKey: string): Promise<boolean> => {
  const upstashLimiter = await getUpstashLimiter();
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(clientKey);
    return !result.success;
  }

  trimMemoryBuckets();
  return isMemoryRateLimited(clientKey);
};

const validateContentLengthHeader = (request: Request): void => {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new RouteError("payload too large", 413);
  }
};

const validateBodyByteLength = (body: string): void => {
  const bodyBytes = new TextEncoder().encode(body).length;
  if (bodyBytes > MAX_REQUEST_BYTES) {
    throw new RouteError("payload too large", 413);
  }
};

const normalizeUrlForLogging = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const normalizedUrl = new URL(value);
    normalizedUrl.search = "";
    normalizedUrl.hash = "";
    return normalizedUrl.toString();
  } catch {
    return value.split("#", 1)[0]?.split("?", 1)[0]?.trim() || undefined;
  }
};

const normalizeStackForLogging = (stack?: string): string | undefined => {
  if (!stack) {
    return undefined;
  }

  const trimmedStack = stack
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 12)
    .join("\n");

  return trimmedStack || undefined;
};

const sanitizeClientErrorPayload = (
  payload: ClientErrorPayload
): Omit<ClientErrorPayload, "userAgent"> => {
  const sanitizedPayload: ClientErrorPayload & { userAgent?: string } = {
    ...payload,
    source: normalizeUrlForLogging(payload.source),
    url: normalizeUrlForLogging(payload.url),
    stack: normalizeStackForLogging(payload.stack),
  };

  delete sanitizedPayload.userAgent;

  if (!sanitizedPayload.source) {
    delete sanitizedPayload.source;
  }
  if (!sanitizedPayload.url) {
    delete sanitizedPayload.url;
  }
  if (!sanitizedPayload.stack) {
    delete sanitizedPayload.stack;
  }

  return sanitizedPayload;
};

const parseClientErrorPayload = (raw: string) => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new RouteError("invalid json", 400);
  }

  const parsed = ClientErrorSchema.safeParse(json);
  if (!parsed.success) {
    throw new RouteError("invalid payload", 400);
  }

  return parsed.data satisfies ClientErrorPayload;
};

export const ingestClientErrorReport = async (
  request: Request
): Promise<{ ok: true }> => {
  try {
    validateContentLengthHeader(request);

    const clientKey = getClientKey(request);
    if (await isRateLimited(clientKey)) {
      throw new RouteError("rate limit exceeded", 429);
    }

    const raw = await request.text();
    validateBodyByteLength(raw);

    const payload = parseClientErrorPayload(raw);
    const sanitizedPayload = sanitizeClientErrorPayload(payload);
    logError("[client-error]", undefined, sanitizedPayload);
    await reportErrorToObservability({
      source: "client-error",
      code: "client_error",
      message: payload.message,
      error: payload.stack ? new Error(payload.message) : undefined,
      stack: payload.stack,
      context: sanitizedPayload,
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof RouteError) {
      throw error;
    }

    logError("[client-error] route failure", error);
    await reportErrorToObservability({
      source: "client-error-route",
      code: "internal_error",
      message: "Client error route failure",
      error,
    });
    throw new RouteError("internal error", 500);
  }
};
