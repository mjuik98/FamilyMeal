import { NextResponse } from "next/server";
import { z } from "zod";

const ClientErrorSchema = z.object({
  type: z.string().trim().min(1),
  message: z.string().trim().min(1),
  stack: z.string().trim().optional(),
  source: z.string().trim().optional(),
  lineno: z.number().int().optional(),
  colno: z.number().int().optional(),
  url: z.string().trim().optional(),
  userAgent: z.string().trim().optional(),
  timestamp: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ClientErrorSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    console.error("[client-error]", payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-error] route failure", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
