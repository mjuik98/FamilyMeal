import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_REQUEST_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

type RateBucket = {
  count: number;
  windowStart: number;
};

const rateBuckets = new Map<string, RateBucket>();

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

const getClientKey = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    const candidate = first?.trim();
    if (candidate) return candidate;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
};

const isRateLimited = (clientKey: string): boolean => {
  const now = Date.now();
  const bucket = rateBuckets.get(clientKey);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
};

const trimBuckets = () => {
  if (rateBuckets.size < 2000) return;

  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateBuckets.delete(key);
    }
  }
};

export async function POST(request: Request) {
  try {
    trimBuckets();

    const clientKey = getClientKey(request);
    if (isRateLimited(clientKey)) {
      return NextResponse.json({ ok: false, error: "rate limit exceeded" }, { status: 429 });
    }

    const contentLengthHeader = request.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
    }

    const raw = await request.text();
    const bodyBytes = new TextEncoder().encode(raw).length;
    if (bodyBytes > MAX_REQUEST_BYTES) {
      return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
    }

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
