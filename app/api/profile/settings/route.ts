import { z } from "zod";

import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { RouteError } from "@/lib/platform/http/route-errors";
import { saveUserNotificationPreferences } from "@/lib/modules/profile/server/profile-use-cases";

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
  return handleRoute(async () => {
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

    return { ok: true, profile };
  });
}
