import { fetchAuthedJson } from "@/lib/platform/http/auth-http";
import { normalizeNotificationPreferences } from "@/lib/activity";
import type { NotificationPreferences } from "@/lib/types";

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const response = await fetchAuthedJson<{ ok: true; profile: { notificationPreferences?: unknown } }>(
    "/api/profile/settings",
    {
      method: "POST",
      body: JSON.stringify({ notificationPreferences: preferences }),
    }
  );

  return normalizeNotificationPreferences(response.profile?.notificationPreferences);
};
