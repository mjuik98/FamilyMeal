import type { User } from "firebase/auth";

import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from "@/lib/activity";
import { fetchAuthedJson } from "@/lib/platform/http/auth-http";
import type { UserProfile, UserRole } from "@/lib/types";

export const buildFallbackUserProfile = (
  firebaseUser: Pick<User, "uid" | "email" | "displayName">
): UserProfile => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  role: null,
  notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
});

export const loadUserProfile = async (firebaseUser: User): Promise<UserProfile> => {
  const payload = await fetchAuthedJson<{ ok: true; profile?: UserProfile | null }>(
    "/api/profile/session"
  );
  const profile = payload.profile;

  if (!profile) {
    return buildFallbackUserProfile(firebaseUser);
  }

  return {
    ...profile,
    notificationPreferences: normalizeNotificationPreferences(profile.notificationPreferences),
  };
};

export const saveUserRole = async (role: UserRole): Promise<UserProfile> => {
  const payload = await fetchAuthedJson<{ ok: true; profile?: UserProfile }>(
    "/api/profile/role",
    {
      method: "POST",
      body: JSON.stringify({ role }),
    }
  );

  if (!payload.profile) {
    throw new Error("역할 저장 결과가 올바르지 않습니다.");
  }

  return {
    ...payload.profile,
    notificationPreferences: normalizeNotificationPreferences(payload.profile.notificationPreferences),
  };
};
