import type { Timestamp } from "firebase-admin/firestore";

export type CommentRouteParams = {
  id: string;
  commentId?: string;
};

export type MealCommentDoc = {
  author?: unknown;
  authorUid?: unknown;
  text?: unknown;
  parentId?: unknown;
  mentionedAuthor?: unknown;
  reactions?: unknown;
  createdAt?: { toMillis?: () => number } | number | null;
  updatedAt?: { toMillis?: () => number } | number | null;
};

export type MealDoc = {
  ownerUid?: unknown;
  userIds?: unknown;
  userId?: unknown;
  commentCount?: unknown;
};

export type CommentCreateResult = {
  id: string;
  author: string;
  authorUid: string;
  text: string;
  parentId?: string;
  mentionedAuthor?: string;
  createdAt: number;
  updatedAt: number;
  timestamp: number;
  reactions: Record<string, never>;
};

export type CommentActivityInput = {
  tx: FirebaseFirestore.Transaction;
  mealId: string;
  commentId: string;
  mealOwnerUid?: string;
  actorUid: string;
  actorRole: import("@/lib/types").UserRole;
  preview: string;
  createdAt: Timestamp;
  parentAuthorUid?: string;
};
