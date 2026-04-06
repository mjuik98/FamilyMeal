import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/lib/modules/profile/domain/notification-preferences";
import { loadProfileAuthUser } from "@/lib/modules/profile/adapters/firebase/profile-admin-auth";
import {
  loadStoredUserProfile,
  runStoredUserProfileTransaction,
  saveStoredUserProfile,
} from "@/lib/modules/profile/adapters/firebase/profile-admin-store";
import { isUserRole } from "@/lib/domain/meal-policy";
import { type VerifiedUser } from "@/lib/platform/auth/server-auth";
import { RouteError } from "@/lib/platform/http/route-errors";
import type {
  NotificationPreferences,
  UserProfile,
  UserRole,
} from "@/lib/types";

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const loadUserProfileSession = async ({
  user,
}: {
  user: VerifiedUser;
}): Promise<UserProfile | null> => {
  const { exists, data } = await loadStoredUserProfile(user.uid);

  if (!exists) {
    return null;
  }

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
  const authUser = await loadProfileAuthUser(user.uid);
  const authEmail = authUser.email ?? user.email;
  const authDisplayName = authUser.displayName;

  return runStoredUserProfileTransaction(user.uid, async (existing) => {
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

    return {
      nextProfile,
      result: nextProfile,
    };
  });
};

export const saveUserNotificationPreferences = async ({
  user,
  notificationPreferences,
}: {
  user: VerifiedUser;
  notificationPreferences: NotificationPreferences;
}) => {
  return saveStoredUserProfile(user.uid, {
    uid: user.uid,
    email: user.email,
    notificationPreferences: normalizeNotificationPreferences(notificationPreferences),
  });
};
