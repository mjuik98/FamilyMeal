import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_REQUEST_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_KEY_PREFIX = "client-error";

type RateBucket = {
  count: number;
  windowStart: number;
};

const inMemoryBuckets = new Map<string, RateBucket>();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const hasUpstash = Boolean(upstashUrl && upstashToken);

const upstashLimiter = hasUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: upstashUrl as string,
        token: upstashToken as string,
      }),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, "1 m"),
      analytics: true,
      prefix: RATE_LIMIT_KEY_PREFIX,
    })
  : null;

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
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(clientKey);
    return !result.success;
  }

  trimMemoryBuckets();
  return isMemoryRateLimited(clientKey);
};

const validateBodySize = (request: Request, body: string): NextResponse | null => {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  const bodyBytes = new TextEncoder().encode(body).length;
  if (bodyBytes > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request);
    if (await isRateLimited(clientKey)) {
      return NextResponse.json({ ok: false, error: "rate limit exceeded" }, { status: 429 });
    }

    const raw = await request.text();
    const tooLargeResponse = validateBodySize(request, raw);
    if (tooLargeResponse) return tooLargeResponse;

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }

    const parsed = ClientErrorSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }

    console.error("[client-error]", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-error] route failure", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
