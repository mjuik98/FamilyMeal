import { Timestamp } from "firebase-admin/firestore";

import {
  deleteStoredActivity,
  setStoredActivity,
} from "@/lib/modules/activity/adapters/firestore/activity-admin-store";
import type { ReactionEmoji, UserActivityType, UserRole } from "@/lib/types";

type AdminTransaction = FirebaseFirestore.Transaction;

const writeActivity = (
  tx: AdminTransaction,
  recipientUid: string,
  activityId: string,
  payload: {
    type: UserActivityType;
    actorUid: string;
    actorRole: UserRole;
    mealId: string;
    preview: string;
    createdAt: Timestamp;
    commentId?: string;
    reactionEmoji?: ReactionEmoji;
  }
) => {
  setStoredActivity(tx, recipientUid, activityId, payload);
};

const deleteActivity = (
  tx: AdminTransaction,
  recipientUid: string,
  activityId: string
) => {
  deleteStoredActivity(tx, recipientUid, activityId);
};

export const createCommentActivities = ({
  tx,
  mealId,
  commentId,
  mealOwnerUid,
  actorUid,
  actorRole,
  preview,
  createdAt,
  parentAuthorUid,
}: {
  tx: AdminTransaction;
  mealId: string;
  commentId: string;
  mealOwnerUid?: string;
  actorUid: string;
  actorRole: UserRole;
  preview: string;
  createdAt: Timestamp;
  parentAuthorUid?: string;
}) => {
  if (parentAuthorUid && parentAuthorUid !== actorUid) {
    writeActivity(tx, parentAuthorUid, `comment-reply:${commentId}:${parentAuthorUid}`, {
      type: "comment-reply",
      actorUid,
      actorRole,
      mealId,
      commentId,
      preview,
      createdAt,
    });
  }

  if (
    mealOwnerUid &&
    mealOwnerUid !== actorUid &&
    mealOwnerUid !== parentAuthorUid
  ) {
    writeActivity(tx, mealOwnerUid, `meal-comment:${commentId}:${mealOwnerUid}`, {
      type: "meal-comment",
      actorUid,
      actorRole,
      mealId,
      commentId,
      preview,
      createdAt,
    });
  }
};

export const syncMealReactionActivity = ({
  tx,
  mealId,
  mealOwnerUid,
  actorUid,
  actorRole,
  emoji,
  preview,
  added,
}: {
  tx: AdminTransaction;
  mealId: string;
  mealOwnerUid?: string;
  actorUid: string;
  actorRole: UserRole;
  emoji: ReactionEmoji;
  preview: string;
  added: boolean;
}) => {
  if (!mealOwnerUid || mealOwnerUid === actorUid) {
    return;
  }

  const activityId = `meal-reaction:${mealId}:${emoji}:${actorUid}:${mealOwnerUid}`;
  if (!added) {
    deleteActivity(tx, mealOwnerUid, activityId);
    return;
  }

  writeActivity(tx, mealOwnerUid, activityId, {
    type: "meal-reaction",
    actorUid,
    actorRole,
    mealId,
    preview,
    createdAt: Timestamp.now(),
    reactionEmoji: emoji,
  });
};

export const syncCommentReactionActivity = ({
  tx,
  mealId,
  commentId,
  commentAuthorUid,
  actorUid,
  actorRole,
  emoji,
  preview,
  added,
}: {
  tx: AdminTransaction;
  mealId: string;
  commentId: string;
  commentAuthorUid?: string;
  actorUid: string;
  actorRole: UserRole;
  emoji: ReactionEmoji;
  preview: string;
  added: boolean;
}) => {
  if (!commentAuthorUid || commentAuthorUid === actorUid) {
    return;
  }

  const activityId = `comment-reaction:${commentId}:${emoji}:${actorUid}:${commentAuthorUid}`;
  if (!added) {
    deleteActivity(tx, commentAuthorUid, activityId);
    return;
  }

  writeActivity(tx, commentAuthorUid, activityId, {
    type: "comment-reaction",
    actorUid,
    actorRole,
    mealId,
    commentId,
    preview,
    createdAt: Timestamp.now(),
    reactionEmoji: emoji,
  });
};
