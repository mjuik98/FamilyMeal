import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 500;

type Params = {
  id: string;
  commentId: string;
};

type CommentDoc = {
  author?: unknown;
  authorUid?: unknown;
  text?: unknown;
  createdAt?: { toMillis?: () => number } | number | null;
  updatedAt?: { toMillis?: () => number } | number | null;
};

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

const CommentUpdateSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

const getErrorStatus = (error: unknown): number =>
  error instanceof AuthError
    ? error.status
    : error instanceof RouteError
      ? error.status
      : 500;

const getErrorMessage = (error: unknown): string =>
  error instanceof AuthError || error instanceof RouteError ? error.message : "internal error";

const toMillis = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return fallback;
};

const decodeParam = (value: string, label: string): string => {
  try {
    return decodeURIComponent(value || "").trim();
  } catch {
    throw new RouteError(`Invalid ${label}`, 400);
  }
};

const getRouteParams = async (params: Promise<Params>) => {
  const { id, commentId } = await params;
  const mealId = decodeParam(id, "meal id");
  const normalizedCommentId = decodeParam(commentId, "comment id");

  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }

  if (!normalizedCommentId) {
    throw new RouteError("Invalid comment id", 400);
  }

  return { mealId, commentId: normalizedCommentId };
};

const ensureCommentAuthor = (comment: CommentDoc, uid: string) => {
  if (typeof comment.authorUid !== "string" || comment.authorUid !== uid) {
    throw new RouteError("Not allowed", 403);
  }
};

const isLegacyParticipant = (meal: { ownerUid?: unknown; userIds?: unknown; userId?: unknown }, role: string | null) => {
  if (typeof meal.ownerUid === "string" && meal.ownerUid) return false;
  if (!role) return false;

  if (Array.isArray(meal.userIds)) {
    return meal.userIds.some((participant) => participant === role);
  }

  return typeof meal.userId === "string" && meal.userId === role;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const { mealId, commentId } = await getRouteParams(context.params);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }
    const parsed = CommentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const commentRef = adminDb.collection("meals").doc(mealId).collection("comments").doc(commentId);
    const updated = await adminDb.runTransaction(async (tx) => {
      const commentSnap = await tx.get(commentRef);
      if (!commentSnap.exists) {
        throw new RouteError("Comment not found", 404);
      }

      const raw = commentSnap.data() as CommentDoc;
      ensureCommentAuthor(raw, user.uid);

      const now = Date.now();
      tx.update(commentRef, {
        text: parsed.data.text.trim(),
        updatedAt: Timestamp.fromMillis(now),
      });

      const createdAt = toMillis(raw.createdAt, now);

      return {
        id: commentSnap.id,
        author: typeof raw.author === "string" ? raw.author : "",
        authorUid: user.uid,
        text: parsed.data.text.trim(),
        createdAt,
        updatedAt: now,
        timestamp: now,
      };
    });

    return NextResponse.json({ ok: true, comment: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const { mealId, commentId } = await getRouteParams(context.params);
    const role = await getUserRole(user.uid);

    const mealRef = adminDb.collection("meals").doc(mealId);
    const commentRef = mealRef.collection("comments").doc(commentId);

    await adminDb.runTransaction(async (tx) => {
      const [mealSnap, commentSnap] = await Promise.all([tx.get(mealRef), tx.get(commentRef)]);

      if (!mealSnap.exists) {
        throw new RouteError("Meal not found", 404);
      }

      if (!commentSnap.exists) {
        throw new RouteError("Comment not found", 404);
      }

      const meal = mealSnap.data() as { ownerUid?: unknown; userIds?: unknown; userId?: unknown; commentCount?: unknown };
      const comment = commentSnap.data() as CommentDoc;

      const isOwner = typeof meal.ownerUid === "string" && meal.ownerUid === user.uid;
      const isAuthor = typeof comment.authorUid === "string" && comment.authorUid === user.uid;
      const isLegacyAllowed = isLegacyParticipant(meal, role);

      if (!isAuthor && !isOwner && !isLegacyAllowed) {
        throw new RouteError("Not allowed", 403);
      }

      const baseCount =
        typeof meal.commentCount === "number" && Number.isFinite(meal.commentCount)
          ? Math.max(0, Math.floor(meal.commentCount))
          : 0;

      tx.delete(commentRef);
      tx.update(mealRef, {
        commentCount: Math.max(0, baseCount - 1),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
