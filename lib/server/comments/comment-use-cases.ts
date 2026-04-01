import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { createCommentActivities } from "@/lib/activity-log";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeReactionMap } from "@/lib/reactions";
import { RouteError } from "@/lib/route-errors";
import { USER_ROLES } from "@/lib/domain/meal-policy";
import type { UserRole } from "@/lib/types";

import type { MealCommentDoc, MealDoc } from "@/lib/server/comments/comment-types";

const VALID_ROLES = new Set(USER_ROLES);

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

const ensureCommentAuthor = (comment: MealCommentDoc, uid: string) => {
  if (typeof comment.authorUid !== "string" || comment.authorUid !== uid) {
    throw new RouteError("Not allowed", 403);
  }
};

export const assertValidCommentRole = (role: string | null): UserRole => {
  if (!role || !VALID_ROLES.has(role as UserRole)) {
    throw new RouteError("Valid user role is required", 403);
  }
  return role as UserRole;
};

export const createMealComment = async ({
  mealId,
  uid,
  actorRole,
  text,
  parentId,
}: {
  mealId: string;
  uid: string;
  actorRole: UserRole;
  text: string;
  parentId?: string;
}) => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  const commentRef = mealRef.collection("comments").doc();

  return adminDb.runTransaction(async (tx) => {
    const mealSnap = await tx.get(mealRef);
    if (!mealSnap.exists) {
      throw new RouteError("Meal not found", 404);
    }

    const mealData = mealSnap.data() as MealDoc;
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

      const parentData = parentSnap.data() as MealCommentDoc;
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
      author: actorRole,
      authorUid: uid,
      text,
      ...(parentId ? { parentId } : {}),
      ...(mentionedAuthor ? { mentionedAuthor } : {}),
      createdAt: nowTs,
      updatedAt: nowTs,
    });

    tx.update(mealRef, {
      commentCount: FieldValue.increment(1),
    });

    createCommentActivities({
      tx,
      mealId,
      commentId: commentRef.id,
      mealOwnerUid: typeof mealData.ownerUid === "string" ? mealData.ownerUid : undefined,
      actorUid: uid,
      actorRole,
      preview: text,
      createdAt: nowTs,
      parentAuthorUid,
    });

    return {
      id: commentRef.id,
      author: actorRole,
      authorUid: uid,
      text,
      ...(parentId ? { parentId } : {}),
      ...(mentionedAuthor ? { mentionedAuthor } : {}),
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      reactions: normalizeReactionMap(undefined),
    };
  });
};

export const updateMealCommentById = async ({
  mealId,
  commentId,
  uid,
  text,
}: {
  mealId: string;
  commentId: string;
  uid: string;
  text: string;
}) => {
  const commentRef = adminDb.collection("meals").doc(mealId).collection("comments").doc(commentId);
  return adminDb.runTransaction(async (tx) => {
    const commentSnap = await tx.get(commentRef);
    if (!commentSnap.exists) {
      throw new RouteError("Comment not found", 404);
    }

    const raw = commentSnap.data() as MealCommentDoc;
    ensureCommentAuthor(raw, uid);

    const now = Date.now();
    tx.update(commentRef, {
      text,
      updatedAt: Timestamp.fromMillis(now),
    });

    const createdAt = toMillis(raw.createdAt, now);
    return {
      id: commentSnap.id,
      author: typeof raw.author === "string" ? raw.author : "",
      authorUid: uid,
      text,
      parentId: typeof raw.parentId === "string" ? raw.parentId : undefined,
      mentionedAuthor: typeof raw.mentionedAuthor === "string" ? raw.mentionedAuthor : undefined,
      createdAt,
      updatedAt: now,
      timestamp: now,
      reactions: normalizeReactionMap(raw.reactions),
    };
  });
};

export const deleteMealCommentById = async ({
  mealId,
  commentId,
  uid,
}: {
  mealId: string;
  commentId: string;
  uid: string;
}) => {
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

    const meal = mealSnap.data() as MealDoc;
    const comment = commentSnap.data() as MealCommentDoc;
    const isOwner = typeof meal.ownerUid === "string" && meal.ownerUid === uid;
    const isAuthor = typeof comment.authorUid === "string" && comment.authorUid === uid;
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
};
