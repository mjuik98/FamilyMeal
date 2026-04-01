import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/lib/activity";
import type { NotificationPreferences, UserRole } from "@/lib/types";

import {
  QA_ACTIVITY_READ_IDS_KEY,
  QA_NOTIFICATION_PREFS_KEY,
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/qa/storage";

export const getQaDefaultRole = (): UserRole => "아빠";

export const getQaNotificationPreferences = (): NotificationPreferences =>
  normalizeNotificationPreferences(
    readJsonFromStorage(
      QA_NOTIFICATION_PREFS_KEY,
      DEFAULT_NOTIFICATION_PREFERENCES
    )
  );

export const setQaNotificationPreferences = (
  prefs: NotificationPreferences
) => {
  writeJsonToStorage(QA_NOTIFICATION_PREFS_KEY, prefs);
};

export const getQaReadActivityIds = (): string[] =>
  readJsonFromStorage<string[]>(QA_ACTIVITY_READ_IDS_KEY, []);

export const setQaReadActivityIds = (activityIds: string[]) => {
  writeJsonToStorage(QA_ACTIVITY_READ_IDS_KEY, activityIds);
};
