import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRouteErrorPayload,
  getRouteErrorStatus,
  RouteError,
} from "@/lib/route-errors";
import { saveUserNotificationPreferences } from "@/lib/server/profile/profile-use-cases";
import { requireVerifiedUser } from "@/lib/server/route-auth";

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
    const user = await requireVerifiedUser(request);

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

    const notificationPreferences = parsed.data.notificationPreferences;
    const profile = await saveUserNotificationPreferences({
      user,
      notificationPreferences,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorPayload(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
