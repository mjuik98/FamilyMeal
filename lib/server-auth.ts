import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type VerifiedUser = {
  uid: string;
  email: string | null;
};

type UserProfileSnapshot = {
  role: string | null;
};

const toVerifiedUser = (decoded: DecodedIdToken): VerifiedUser => ({
  uid: decoded.uid,
  email: typeof decoded.email === "string" ? decoded.email : null,
});

const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAllowedEmail = (email: string | null): boolean => {
  if (allowedEmails.length === 0) return true;
  if (!email) return false;
  return allowedEmails.includes(email.toLowerCase());
};

export const verifyRequestUser = async (request: Request): Promise<VerifiedUser> => {
  const raw = request.headers.get("authorization") ?? "";
  if (!raw.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token", 401);
  }

  const token = raw.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError("Empty bearer token", 401);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = toVerifiedUser(decoded);
    if (!isAllowedEmail(user.email)) {
      throw new AuthError("Email is not allowed", 403);
    }
    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError("Invalid auth token", 401);
  }
};

export const getUserRole = async (uid: string): Promise<string | null> => {
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AuthError("User profile is required", 403);
  }

  const data = userSnap.data() as Partial<UserProfileSnapshot>;
  return typeof data.role === "string" ? data.role : null;
};
