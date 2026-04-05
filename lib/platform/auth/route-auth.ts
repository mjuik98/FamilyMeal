import { isUserRole } from "@/lib/domain/meal-policy";
import { RouteError } from "@/lib/platform/http/route-errors";
import {
  getUserRole,
  verifyRequestUser,
  type VerifiedUser,
} from "@/lib/platform/auth/server-auth";
import type { UserRole } from "@/lib/types";

export const requireVerifiedUser = async (
  request: Request
): Promise<VerifiedUser> => verifyRequestUser(request);

export const requireValidatedUserRole = async (
  request: Request,
  validateRole?: (role: string | null) => UserRole
): Promise<{ user: VerifiedUser; role: UserRole }> => {
  const user = await verifyRequestUser(request);
  const role = await getUserRole(user.uid);

  if (validateRole) {
    return { user, role: validateRole(role) };
  }

  if (!isUserRole(role)) {
    throw new RouteError("Valid user role is required", 403);
  }

  return { user, role };
};
