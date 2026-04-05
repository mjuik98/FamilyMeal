import { NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { logError } from "@/lib/logging";
import {
  getRouteErrorPayload,
  RouteError,
} from "@/lib/platform/http/route-errors";

const MAX_REQUEST_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_KEY_PREFIX = "client-error";

type RateBucket = {
  count: number;
  windowStart: number;
};

const inMemoryBuckets = new Map<string, RateBucket>();

const upstashUrl = serverEnv.upstash.url;
const upstashToken = serverEnv.upstash.token;
const hasUpstash = Boolean(upstashUrl && upstashToken);

type UpstashLimiter = {
  limit: (key: string) => Promise<{ success: boolean }>;
};

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

const parseForwardedIp = (value: string | null): string | null => {
  if (!value) return null;
  const [first] = value.split(",");
  const candidate = first?.trim();
  return candidate || null;
};

const getClientKey = (request: Request): string => {
  const vercelForwarded = parseForwardedIp(request.headers.get("x-vercel-forwarded-for"));
  if (vercelForwarded) return vercelForwarded;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = parseForwardedIp(request.headers.get("x-forwarded-for"));
  return forwardedFor || "unknown";
};

const trimMemoryBuckets = () => {
  if (inMemoryBuckets.size < 2000) return;

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

const buildPayloadTooLargeResponse = (): NextResponse =>
  NextResponse.json(
    {
      ok: false,
      error: getRouteErrorPayload(new RouteError("payload too large", 413)),
    },
    { status: 413 }
  );

const validateContentLengthHeader = (request: Request): NextResponse | null => {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return buildPayloadTooLargeResponse();
  }

  return null;
};

const validateBodyByteLength = (body: string): NextResponse | null => {
  const bodyBytes = new TextEncoder().encode(body).length;
  if (bodyBytes > MAX_REQUEST_BYTES) {
    return buildPayloadTooLargeResponse();
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const tooLargeHeaderResponse = validateContentLengthHeader(request);
    if (tooLargeHeaderResponse) return tooLargeHeaderResponse;

    const clientKey = getClientKey(request);
    if (await isRateLimited(clientKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: getRouteErrorPayload(new RouteError("rate limit exceeded", 429)),
        },
        { status: 429 }
      );
    }

    const raw = await request.text();
    const tooLargeBodyResponse = validateBodyByteLength(raw);
    if (tooLargeBodyResponse) return tooLargeBodyResponse;

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: getRouteErrorPayload(new RouteError("invalid json", 400)),
        },
        { status: 400 }
      );
    }

    const parsed = ClientErrorSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: getRouteErrorPayload(new RouteError("invalid payload", 400)),
        },
        { status: 400 }
      );
    }

    logError("[client-error]", undefined, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("[client-error] route failure", error);
    return NextResponse.json(
      {
        ok: false,
        error: getRouteErrorPayload(new RouteError("internal error", 500)),
      },
      { status: 500 }
    );
  }
}
