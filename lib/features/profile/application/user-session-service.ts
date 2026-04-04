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
  isQaRuntimeActive,
  saveQaRuntimeNotificationPreferences,
  setQaRuntimeRole,
} from "@/lib/qa/runtime";

export const isUserSessionQaMode = (): boolean => isQaRuntimeActive();

export const getRuntimeUserContextValue = (role?: UserRole) =>
  getQaUserContextValue(role);

export const clearRuntimeUserSession = () => {
  clearQaRuntimeSession();
};

export const loadUserProfileWithFallback = async (firebaseUser: User) => {
  try {
    return {
      userProfile: await loadUserProfile(firebaseUser),
      authError: null,
    };
  } catch {
    return {
      userProfile: buildFallbackUserProfile(firebaseUser),
      authError:
        "로그인 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

export const saveSelectedUserRole = async ({
  user,
  role,
  previousProfile,
}: {
  user?: User | null;
  role: UserRole;
  previousProfile?: UserProfile | null;
}): Promise<UserProfile> => {
  if (isUserSessionQaMode()) {
    return setQaRuntimeRole(role, previousProfile);
  }

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return saveUserRole(role);
};

export const saveUserNotificationSelection = async ({
  preferences,
  previousProfile,
}: {
  preferences: NotificationPreferences;
  previousProfile?: UserProfile | null;
}): Promise<UserProfile | null> => {
  if (isUserSessionQaMode()) {
    return saveQaRuntimeNotificationPreferences(preferences, previousProfile);
  }

  const savedPreferences = await saveNotificationPreferences(preferences);
  return previousProfile
    ? { ...previousProfile, notificationPreferences: savedPreferences }
    : previousProfile ?? null;
};
