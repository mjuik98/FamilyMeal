import type { NotificationPreferences } from "@/lib/types";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browserEnabled: true,
  commentAlerts: true,
  reactionAlerts: true,
  replyAlerts: true,
};

export const normalizeNotificationPreferences = (
  value: unknown
): NotificationPreferences => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const source = value as Partial<NotificationPreferences>;
  return {
    browserEnabled:
      typeof source.browserEnabled === "boolean"
        ? source.browserEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.browserEnabled,
    commentAlerts:
      typeof source.commentAlerts === "boolean"
        ? source.commentAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.commentAlerts,
    reactionAlerts:
      typeof source.reactionAlerts === "boolean"
        ? source.reactionAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.reactionAlerts,
    replyAlerts:
      typeof source.replyAlerts === "boolean"
        ? source.replyAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.replyAlerts,
  };
};
