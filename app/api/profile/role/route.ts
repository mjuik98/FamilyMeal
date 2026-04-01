import { NextResponse } from "next/server";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["아빠", "엄마", "딸", "아들"] as const;
const allowRoleReassign = process.env.ALLOW_ROLE_REASSIGN === "true";
const DEFAULT_NOTIFICATION_PREFERENCES = {
  browserEnabled: true,
  commentAlerts: true,
  reactionAlerts: true,
  replyAlerts: true,
};

type UserProfileDoc = {
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  notificationPreferences?: unknown;
};

const RoleUpdateSchema = z.object({
  role: z.enum(VALID_ROLES),
});

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export async function POST(request: Request) {
  try {
    const user = await verifyRequestUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }

    const parsed = RoleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const requestedRole = parsed.data.role;
    const userRef = adminDb.collection("users").doc(user.uid);
    const authUser = await adminAuth.getUser(user.uid);
    const authEmail = toStringOrNull(authUser.email) ?? user.email;
    const authDisplayName = toStringOrNull(authUser.displayName);

    const updatedProfile = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const existing = (snap.data() ?? {}) as UserProfileDoc;
      const currentRole = toStringOrNull(existing.role);

      if (
        currentRole &&
        currentRole !== requestedRole &&
        !allowRoleReassign
      ) {
        throw new RouteError("Role is locked. Contact admin to change it.", 403);
      }

      const nextProfile = {
        uid: user.uid,
        email: toStringOrNull(existing.email) ?? authEmail,
        displayName: toStringOrNull(existing.displayName) ?? authDisplayName,
        role: requestedRole,
        notificationPreferences:
          existing.notificationPreferences && typeof existing.notificationPreferences === "object"
            ? existing.notificationPreferences
            : DEFAULT_NOTIFICATION_PREFERENCES,
      };

      if (!nextProfile.email) {
        throw new RouteError("Authenticated email is required", 403);
      }

      tx.set(userRef, nextProfile, { merge: true });
      return nextProfile;
    });

    return NextResponse.json({ ok: true, profile: updatedProfile });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
