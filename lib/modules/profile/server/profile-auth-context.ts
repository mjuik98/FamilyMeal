import { isUserRole } from "@/lib/domain/meal-policy";
import { loadStoredUserProfile } from "@/lib/modules/profile/adapters/firebase/profile-admin-store";
import { AuthError } from "@/lib/platform/auth/server-auth";
import type { UserRole } from "@/lib/types";

export const loadUserRoleForUser = async (uid: string): Promise<UserRole | null> => {
  const { exists, data } = await loadStoredUserProfile(uid);

  if (!exists) {
    throw new AuthError("User profile is required", 403);
  }

  return isUserRole(data.role) ? data.role : null;
};
