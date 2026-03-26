import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { AuthError, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NotificationPreferencesSchema = z.object({
  browserEnabled: z.boolean(),
  commentAlerts: z.boolean(),
  reactionAlerts: z.boolean(),
  replyAlerts: z.boolean(),
});

const SettingsSchema = z.object({
  notificationPreferences: NotificationPreferencesSchema,
});

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

const getErrorStatus = (error: unknown): number =>
  error instanceof AuthError
    ? error.status
    : error instanceof RouteError
      ? error.status
      : 500;

const getErrorMessage = (error: unknown): string =>
  error instanceof AuthError || error instanceof RouteError ? error.message : "internal error";

export async function POST(request: Request) {
  try {
    const user = await verifyRequestUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }

    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const userRef = adminDb.collection("users").doc(user.uid);
    const notificationPreferences = parsed.data.notificationPreferences;

    await userRef.set(
      {
        uid: user.uid,
        email: user.email,
        notificationPreferences,
      },
      { merge: true }
    );

    const snapshot = await userRef.get();
    return NextResponse.json({ ok: true, profile: snapshot.data() ?? {} });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
