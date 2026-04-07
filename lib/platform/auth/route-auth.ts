import {
  verifyRequestUser,
  type VerifiedUser,
} from "@/lib/platform/auth/server-auth";

export const requireVerifiedUser = async (
  request: Request
): Promise<VerifiedUser> => verifyRequestUser(request);

export const requireValidatedUserRole = async (
  request: Request,
  validateRole?: Parameters<
    typeof import("@/lib/modules/profile/server/profile-route-auth").requireValidatedUserRole
  >[1]
) =>
  (await import("@/lib/modules/profile/server/profile-route-auth")).requireValidatedUserRole(
    request,
    validateRole
  );
