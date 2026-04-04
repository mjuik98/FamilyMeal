import type { User } from "firebase/auth";

import type {
  NotificationPreferences,
  UserProfile,
  UserRole,
} from "@/lib/types";
import { QA_MOCK_MODE_KEY, isQaMockMode } from "@/lib/qa/mode";
import {
  getQaDefaultRole,
  getQaNotificationPreferences,
  setQaNotificationPreferences,
} from "@/lib/qa/session";

const createQaUser = (): User => ({ uid: "qa-user" } as User);

const createQaProfile = (
  role: UserRole = getQaDefaultRole(),
  notificationPreferences: NotificationPreferences = getQaNotificationPreferences()
): UserProfile => ({
  uid: "qa-user",
  email: "qa@example.com",
  displayName: "QA User",
  role,
  notificationPreferences,
});

export const isQaUserSessionRuntimeActive = (): boolean => isQaMockMode();

export const getQaUserContextValue = (role: UserRole = getQaDefaultRole()) => ({
  user: createQaUser(),
  userProfile: createQaProfile(role),
});

export const clearQaRuntimeSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QA_MOCK_MODE_KEY);
  }
};

export const setQaRuntimeRole = (
  role: UserRole,
  previousProfile?: UserProfile | null
): UserProfile =>
  createQaProfile(
    role,
    previousProfile?.notificationPreferences ?? getQaNotificationPreferences()
  );

export const saveQaRuntimeNotificationPreferences = (
  preferences: NotificationPreferences,
  previousProfile?: UserProfile | null
): UserProfile => {
  setQaNotificationPreferences(preferences);
  return createQaProfile(previousProfile?.role ?? getQaDefaultRole(), preferences);
};
