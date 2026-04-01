import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { normalizeReactionMap } from "@/lib/reactions";
import { verifyRequestUser } from "@/lib/server-auth";

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
  parentId?: unknown;
  mentionedAuthor?: unknown;
  reactions?: unknown;
  createdAt?: { toMillis?: () => number } | number | null;
  updatedAt?: { toMillis?: () => number } | number | null;
};

const CommentUpdateSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

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
        parentId: typeof raw.parentId === "string" ? raw.parentId : undefined,
        mentionedAuthor: typeof raw.mentionedAuthor === "string" ? raw.mentionedAuthor : undefined,
        createdAt,
        updatedAt: now,
        timestamp: now,
        reactions: normalizeReactionMap(raw.reactions),
      };
    });

    return NextResponse.json({ ok: true, comment: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
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

      if (!isAuthor && !isOwner) {
        throw new RouteError("Not allowed", 403);
      }

      const baseCount =
        typeof meal.commentCount === "number" && Number.isFinite(meal.commentCount)
          ? Math.max(0, Math.floor(meal.commentCount))
          : 0;

      const repliesQuery = mealRef.collection("comments").where("parentId", "==", commentId).limit(1);
      const repliesSnap = await tx.get(repliesQuery);
      if (!repliesSnap.empty) {
        throw new RouteError("Reply comments exist", 409);
      }

      tx.delete(commentRef);
      tx.update(mealRef, {
        commentCount: baseCount > 0 ? FieldValue.increment(-1) : 0,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
