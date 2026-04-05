import type { DecodedIdToken } from "firebase-admin/auth";

import { serverEnv } from "@/lib/config/server-env";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { normalizeErrorCode } from "@/lib/platform/errors/error-contract";

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, status = 401, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code =
      code ??
      normalizeErrorCode(message, status >= 500 ? "internal_error" : "auth_error");
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

const allowedEmails = serverEnv.allowedEmails;
const isProduction = serverEnv.isProduction;

const assertAllowlistConfigured = () => {
  if (isProduction && allowedEmails.length === 0) {
    throw new AuthError("Server allowlist is not configured", 503);
  }
};

const isAllowedEmail = (email: string | null): boolean => {
  if (allowedEmails.length === 0) return true;
  if (!email) return false;
  return allowedEmails.includes(email.toLowerCase());
};

const verifyAllowlistedEmail = (email: string | null) => {
  if (isAllowedEmail(email)) return;
  throw new AuthError("Email is not allowed", 403);
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const getUnverifiedEmailFromToken = (token: string): string | null => {
  const payload = decodeJwtPayload(token);
  return typeof payload?.email === "string" ? payload.email : null;
};

const isAdminCredentialError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  if (code === "app/invalid-credential" || code === "auth/invalid-credential") {
    return true;
  }

  return (
    message.includes("Could not load the default credentials") ||
    message.includes("Failed to determine service account")
  );
};

const parseAuthFailure = (error: unknown): { code: string; message: string } => {
  if (!error || typeof error !== "object") {
    return { code: "", message: "" };
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return { code, message };
};

const isTokenExpiredError = (code: string, message: string): boolean =>
  code === "auth/id-token-expired" ||
  code === "auth/id-token-revoked" ||
  message.includes("ID token has expired") ||
  message.includes("ID token has been revoked");

const isProjectMismatchError = (message: string): boolean =>
  message.includes('incorrect "aud" (audience) claim') ||
  message.includes('incorrect "iss" (issuer) claim') ||
  message.includes("Make sure the ID token comes from the same Firebase project");

export const verifyRequestUser = async (request: Request): Promise<VerifiedUser> => {
  assertAllowlistConfigured();

  const raw = request.headers.get("authorization") ?? "";
  if (!raw.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token", 401);
  }

  const token = raw.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError("Empty bearer token", 401);
  }

  const unverifiedEmail = getUnverifiedEmailFromToken(token);
  if (unverifiedEmail && !isAllowedEmail(unverifiedEmail)) {
    throw new AuthError("Email is not allowed", 403);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = toVerifiedUser(decoded);
    verifyAllowlistedEmail(user.email);
    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    if (isAdminCredentialError(error)) {
      throw new AuthError("Server auth is not configured", 503);
    }
    const { code, message } = parseAuthFailure(error);
    if (isTokenExpiredError(code, message)) {
      throw new AuthError("Auth token expired", 401);
    }
    if (isProjectMismatchError(message)) {
      throw new AuthError("Server Firebase project mismatch", 503);
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
