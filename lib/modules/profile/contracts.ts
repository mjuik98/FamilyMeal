import type { NotificationPreferences, UserRole } from "@/lib/types";

export type SaveUserRoleCommand = {
  role: UserRole;
};

export type SaveUserNotificationPreferencesCommand = {
  preferences: NotificationPreferences;
};
