import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from "@/lib/activity";
import { fetchAuthedJson } from "@/lib/client/auth-http";
import { db } from "@/lib/firebase";
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
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    return buildFallbackUserProfile(firebaseUser);
  }

  const data = userDoc.data() as UserProfile;
  return {
    ...data,
    notificationPreferences: normalizeNotificationPreferences(data.notificationPreferences),
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
