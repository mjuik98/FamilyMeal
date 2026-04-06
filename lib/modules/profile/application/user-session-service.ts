import type { User } from "firebase/auth";

import {
  buildFallbackUserProfileFromRuntime,
  clearUserSessionRuntime,
  getUserContextValueFromRuntime,
  isUserSessionQaRuntime,
  loadUserProfileFromRuntime,
  saveUserNotificationPreferencesInRuntime,
  saveUserRoleInRuntime,
} from "@/lib/modules/profile/infrastructure/user-session-runtime";
import type { NotificationPreferences, UserProfile, UserRole } from "@/lib/types";

export const isUserSessionQaMode = (): boolean => isUserSessionQaRuntime();

export const getRuntimeUserContextValue = (role?: UserRole) =>
  getUserContextValueFromRuntime(role);

export const clearRuntimeUserSession = () => {
  clearUserSessionRuntime();
};

export const loadUserProfileWithFallback = async (firebaseUser: User) => {
  try {
    return {
      userProfile: await loadUserProfileFromRuntime(firebaseUser),
      authError: null,
    };
  } catch {
    return {
      userProfile: buildFallbackUserProfileFromRuntime(firebaseUser),
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
  return saveUserRoleInRuntime({
    user,
    role,
    previousProfile,
  });
};

export const saveUserNotificationSelection = async ({
  preferences,
  previousProfile,
}: {
  preferences: NotificationPreferences;
  previousProfile?: UserProfile | null;
}): Promise<UserProfile | null> => {
  return saveUserNotificationPreferencesInRuntime({
    preferences,
    previousProfile,
  });
};
