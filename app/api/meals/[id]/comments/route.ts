import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 500;
const VALID_ROLES = new Set(["아빠", "엄마", "딸", "아들"]);

type Params = {
  id: string;
};

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

const CommentCreateSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

const getMealId = async (params: Promise<Params>): Promise<string> => {
  const { id } = await params;
  const mealId = decodeURIComponent(id || "").trim();
  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }
  return mealId;
};

const getErrorStatus = (error: unknown): number =>
  error instanceof AuthError
    ? error.status
    : error instanceof RouteError
      ? error.status
      : 500;

const getErrorMessage = (error: unknown): string =>
  error instanceof AuthError || error instanceof RouteError ? error.message : "internal error";

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const mealId = await getMealId(context.params);
    const role = await getUserRole(user.uid);

    if (!role || !VALID_ROLES.has(role)) {
      throw new RouteError("Valid user role is required", 403);
    }

    const body = await request.json();
    const parsed = CommentCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const trimmed = parsed.data.text.trim();
    const mealRef = adminDb.collection("meals").doc(mealId);
    const commentRef = mealRef.collection("comments").doc();

    const created = await adminDb.runTransaction(async (tx) => {
      const mealSnap = await tx.get(mealRef);
      if (!mealSnap.exists) {
        throw new RouteError("Meal not found", 404);
      }

      const mealData = mealSnap.data() as { commentCount?: unknown };
      const baseCount =
        typeof mealData.commentCount === "number" && Number.isFinite(mealData.commentCount)
          ? Math.max(0, Math.floor(mealData.commentCount))
          : 0;

      const now = Date.now();
      const nowTs = Timestamp.fromMillis(now);

      tx.set(commentRef, {
        author: role,
        authorUid: user.uid,
        text: trimmed,
        createdAt: nowTs,
        updatedAt: nowTs,
      });

      tx.update(mealRef, {
        commentCount: baseCount + 1,
      });

      return {
        id: commentRef.id,
        author: role,
        authorUid: user.uid,
        text: trimmed,
        createdAt: now,
        updatedAt: now,
        timestamp: now,
      };
    });

    return NextResponse.json({ ok: true, comment: created });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
