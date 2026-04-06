import { isUserRole } from "@/lib/domain/meal-policy";
import { adminDb } from "@/lib/firebase-admin";
import { AuthError } from "@/lib/platform/auth/server-auth";
import type { UserRole } from "@/lib/types";

type UserRoleSnapshot = {
  role?: unknown;
};

export const loadUserRoleForUser = async (uid: string): Promise<UserRole | null> => {
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AuthError("User profile is required", 403);
  }

  const data = userSnap.data() as UserRoleSnapshot;
  return isUserRole(data.role) ? data.role : null;
};
