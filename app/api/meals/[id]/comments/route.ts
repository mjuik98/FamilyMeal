import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { createCommentActivities } from "@/lib/activity-log";
import { normalizeReactionMap } from "@/lib/reactions";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 500;
const VALID_ROLES = new Set(["아빠", "엄마", "딸", "아들"]);

type Params = {
  id: string;
};

type MealDoc = {
  commentCount?: unknown;
  ownerUid?: unknown;
};

type CommentDoc = {
  author?: unknown;
  authorUid?: unknown;
  parentId?: unknown;
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
  parentId: z.string().trim().min(1).optional(),
});

const getMealId = async (params: Promise<Params>): Promise<string> => {
  const { id } = await params;
  let mealId = "";
  try {
    mealId = decodeURIComponent(id || "").trim();
  } catch {
    throw new RouteError("Invalid meal id", 400);
  }
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
    const actorRole = role as UserRole;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }
    const parsed = CommentCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const trimmed = parsed.data.text.trim();
    const parentId = parsed.data.parentId?.trim();
    const mealRef = adminDb.collection("meals").doc(mealId);
    const commentRef = mealRef.collection("comments").doc();

    const created = await adminDb.runTransaction(async (tx) => {
      const mealSnap = await tx.get(mealRef);
      if (!mealSnap.exists) {
        throw new RouteError("Meal not found", 404);
      }

      const mealData = mealSnap.data() as MealDoc;
      const baseCount =
        typeof mealData.commentCount === "number" && Number.isFinite(mealData.commentCount)
          ? Math.max(0, Math.floor(mealData.commentCount))
          : 0;

      const now = Date.now();
      const nowTs = Timestamp.fromMillis(now);
      let mentionedAuthor: string | undefined;
      let parentAuthorUid: string | undefined;

      if (parentId) {
        const parentRef = mealRef.collection("comments").doc(parentId);
        const parentSnap = await tx.get(parentRef);
        if (!parentSnap.exists) {
          throw new RouteError("Parent comment not found", 404);
        }

        const parentData = parentSnap.data() as CommentDoc;
        if (typeof parentData.parentId === "string" && parentData.parentId.trim().length > 0) {
          throw new RouteError("Nested replies are not supported", 400);
        }
        if (typeof parentData.author === "string") {
          mentionedAuthor = parentData.author;
        }
        if (typeof parentData.authorUid === "string" && parentData.authorUid.trim().length > 0) {
          parentAuthorUid = parentData.authorUid;
        }
      }

      tx.set(commentRef, {
        author: role,
        authorUid: user.uid,
        text: trimmed,
        ...(parentId ? { parentId } : {}),
        ...(mentionedAuthor ? { mentionedAuthor } : {}),
        createdAt: nowTs,
        updatedAt: nowTs,
      });

      tx.update(mealRef, {
        commentCount: baseCount + 1,
      });

      createCommentActivities({
        tx,
        mealId,
        commentId: commentRef.id,
        mealOwnerUid: typeof mealData.ownerUid === "string" ? mealData.ownerUid : undefined,
        actorUid: user.uid,
        actorRole,
        preview: trimmed,
        createdAt: nowTs,
        parentAuthorUid,
      });

      return {
        id: commentRef.id,
        author: actorRole,
        authorUid: user.uid,
        text: trimmed,
        ...(parentId ? { parentId } : {}),
        ...(mentionedAuthor ? { mentionedAuthor } : {}),
        createdAt: now,
        updatedAt: now,
        timestamp: now,
        reactions: normalizeReactionMap(undefined),
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
