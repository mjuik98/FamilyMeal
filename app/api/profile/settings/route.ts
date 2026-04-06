import { z } from "zod";

import { handleRoute } from "@/lib/platform/http/route-handler";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { parseJsonBody } from "@/lib/platform/http/request-body";
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

    const { notificationPreferences } = await parseJsonBody(request, {
      schema: SettingsSchema,
    });
    const profile = await saveUserNotificationPreferences({
      user,
      notificationPreferences,
    });

    return { ok: true, profile };
  });
}
