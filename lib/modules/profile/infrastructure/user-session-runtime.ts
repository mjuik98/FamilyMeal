import type { User } from "firebase/auth";

import { updateNotificationPreferences as saveNotificationPreferences } from "@/lib/client/activity";
import {
  buildFallbackUserProfile,
  loadUserProfile,
  saveUserRole,
} from "@/lib/client/profile-session";
import type {
  NotificationPreferences,
  UserProfile,
  UserRole,
} from "@/lib/types";
import {
  clearQaRuntimeSession,
  getQaUserContextValue,
  saveQaRuntimeNotificationPreferences,
  setQaRuntimeRole,
  isQaUserSessionRuntimeActive,
} from "@/lib/qa/adapters/profile";

export const isUserSessionQaRuntime = (): boolean => isQaUserSessionRuntimeActive();

export const getUserContextValueFromRuntime = (role?: UserRole) =>
  getQaUserContextValue(role);

export const clearUserSessionRuntime = () => {
  clearQaRuntimeSession();
};

export const loadUserProfileFromRuntime = (firebaseUser: User) =>
  loadUserProfile(firebaseUser);

export const buildFallbackUserProfileFromRuntime = (
  firebaseUser: Pick<User, "uid" | "email" | "displayName">
) => buildFallbackUserProfile(firebaseUser);

export const saveUserRoleInRuntime = async ({
  user,
  role,
  previousProfile,
}: {
  user?: User | null;
  role: UserRole;
  previousProfile?: UserProfile | null;
}): Promise<UserProfile> => {
  if (isUserSessionQaRuntime()) {
    return setQaRuntimeRole(role, previousProfile);
  }

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return saveUserRole(role);
};

export const saveUserNotificationPreferencesInRuntime = async ({
  preferences,
  previousProfile,
}: {
  preferences: NotificationPreferences;
  previousProfile?: UserProfile | null;
}): Promise<UserProfile | null> => {
  if (isUserSessionQaRuntime()) {
    return saveQaRuntimeNotificationPreferences(preferences, previousProfile);
  }

  const savedPreferences = await saveNotificationPreferences(preferences);
  return previousProfile
    ? { ...previousProfile, notificationPreferences: savedPreferences }
    : previousProfile ?? null;
};
