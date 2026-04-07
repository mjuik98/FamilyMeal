import { isUserRole } from "@/lib/domain/user-role";
import { loadUserRoleForUser } from "@/lib/modules/profile/server/profile-auth-context";
import {
  verifyRequestUser,
  type VerifiedUser,
} from "@/lib/platform/auth/server-auth";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { UserRole } from "@/lib/types";

export const requireValidatedUserRole = async (
  request: Request,
  validateRole?: (role: string | null) => UserRole
): Promise<{ user: VerifiedUser; role: UserRole }> => {
  const user = await verifyRequestUser(request);
  const role = await loadUserRoleForUser(user.uid);

  if (validateRole) {
    return { user, role: validateRole(role) };
  }

  if (!isUserRole(role)) {
    throw new RouteError("Valid user role is required", 403);
  }

  return { user, role };
};
