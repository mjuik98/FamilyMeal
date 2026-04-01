import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { verifyRequestUser } from "@/lib/server-auth";

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
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
