import { adminDb } from "@/lib/firebase-admin";
import type { ReactionEmoji, UserActivityType, UserRole } from "@/lib/types";

type AdminTransaction = FirebaseFirestore.Transaction;

const activityRef = (recipientUid: string, activityId: string) =>
  adminDb.collection("users").doc(recipientUid).collection("activity").doc(activityId);

export const setStoredActivity = (
  tx: AdminTransaction,
  recipientUid: string,
  activityId: string,
  payload: {
    type: UserActivityType;
    actorUid: string;
    actorRole: UserRole;
    mealId: string;
    preview: string;
    createdAt: FirebaseFirestore.Timestamp;
    commentId?: string;
    reactionEmoji?: ReactionEmoji;
  }
) => {
  tx.set(activityRef(recipientUid, activityId), payload, { merge: true });
};

export const deleteStoredActivity = (
  tx: AdminTransaction,
  recipientUid: string,
  activityId: string
) => {
  tx.delete(activityRef(recipientUid, activityId));
};
