import { adminAuth } from "@/lib/firebase-admin";

export type ProfileAuthUser = {
  email: string | null;
  displayName: string | null;
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const loadProfileAuthUser = async (uid: string): Promise<ProfileAuthUser> => {
  const authUser = await adminAuth.getUser(uid);

  return {
    email: toStringOrNull(authUser.email),
    displayName: toStringOrNull(authUser.displayName),
  };
};
