import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from "@/lib/activity";
import { isUserRole } from "@/lib/domain/meal-policy";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { RouteError } from "@/lib/route-errors";
import type { VerifiedUser } from "@/lib/server-auth";
import type { NotificationPreferences, UserProfile, UserRole } from "@/lib/types";

type UserProfileDoc = {
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  notificationPreferences?: unknown;
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const loadUserProfileSession = async ({
  user,
}: {
  user: VerifiedUser;
}): Promise<UserProfile | null> => {
  const userRef = adminDb.collection("users").doc(user.uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as UserProfileDoc;
  return {
    uid: user.uid,
    email: toStringOrNull(data.email) ?? user.email,
    displayName: toStringOrNull(data.displayName),
    role: isUserRole(data.role) ? data.role : null,
    notificationPreferences: normalizeNotificationPreferences(
      data.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES
    ),
  };
};

export const saveUserRoleProfile = async ({
  user,
  requestedRole,
  allowRoleReassign,
}: {
  user: VerifiedUser;
  requestedRole: UserRole;
  allowRoleReassign: boolean;
}) => {
  const userRef = adminDb.collection("users").doc(user.uid);
  const authUser = await adminAuth.getUser(user.uid);
  const authEmail = toStringOrNull(authUser.email) ?? user.email;
  const authDisplayName = toStringOrNull(authUser.displayName);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const existing = (snap.data() ?? {}) as UserProfileDoc;
    const currentRole = toStringOrNull(existing.role);

    if (currentRole && currentRole !== requestedRole && !allowRoleReassign) {
      throw new RouteError("Role is locked. Contact admin to change it.", 403);
    }

    const nextProfile = {
      uid: user.uid,
      email: toStringOrNull(existing.email) ?? authEmail,
      displayName: toStringOrNull(existing.displayName) ?? authDisplayName,
      role: requestedRole,
      notificationPreferences: normalizeNotificationPreferences(
        existing.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES
      ),
    };

    if (!nextProfile.email) {
      throw new RouteError("Authenticated email is required", 403);
    }

    tx.set(userRef, nextProfile, { merge: true });
    return nextProfile;
  });
};

export const saveUserNotificationPreferences = async ({
  user,
  notificationPreferences,
}: {
  user: VerifiedUser;
  notificationPreferences: NotificationPreferences;
}) => {
  const userRef = adminDb.collection("users").doc(user.uid);
  await userRef.set(
    {
      uid: user.uid,
      email: user.email,
      notificationPreferences: normalizeNotificationPreferences(notificationPreferences),
    },
    { merge: true }
  );

  const snapshot = await userRef.get();
  return snapshot.data() ?? {};
};
