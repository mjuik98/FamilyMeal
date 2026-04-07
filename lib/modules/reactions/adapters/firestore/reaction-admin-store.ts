import { adminDb } from "@/lib/firebase-admin";
import { syncCommentReactionActivity, syncMealReactionActivity } from "@/lib/modules/activity/server/activity-log";
import { assertMealVisibleToRole } from "@/lib/modules/meals/server/meal-visibility";
import {
  normalizeReactionMap,
  toggleReactionInMap,
} from "@/lib/modules/reactions/domain/reaction-map";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { ReactionEmoji, ReactionMap, UserRole } from "@/lib/types";

export const toggleStoredMealReactionForUser = async ({
  mealId,
  uid,
  actorRole,
  emoji,
}: {
  mealId: string;
  uid: string;
  actorRole: UserRole;
  emoji: ReactionEmoji;
}): Promise<ReactionMap> => {
  const mealRef = adminDb.collection("meals").doc(mealId);

  return adminDb.runTransaction(async (tx) => {
    const mealSnap = await tx.get(mealRef);
    if (!mealSnap.exists) {
      throw new RouteError("Meal not found", 404);
    }

    const mealData = mealSnap.data() as {
      reactions?: unknown;
      ownerUid?: unknown;
      userId?: unknown;
      userIds?: unknown;
      description?: unknown;
    };
    assertMealVisibleToRole(mealData, actorRole);
    const previousReactions = normalizeReactionMap(mealData.reactions);
    const hadReaction = previousReactions[emoji]?.includes(uid) ?? false;
    const nextReactions = toggleReactionInMap(previousReactions, emoji, uid);

    tx.update(mealRef, {
      reactions: nextReactions,
    });

    syncMealReactionActivity({
      tx,
      mealId,
      mealOwnerUid:
        typeof mealData.ownerUid === "string" ? mealData.ownerUid : undefined,
      actorUid: uid,
      actorRole,
      emoji,
      preview:
        typeof mealData.description === "string" ? mealData.description : "",
      added: !hadReaction,
    });

    return nextReactions;
  });
};

export const toggleStoredCommentReactionForUser = async ({
  mealId,
  commentId,
  uid,
  actorRole,
  emoji,
}: {
  mealId: string;
  commentId: string;
  uid: string;
  actorRole: UserRole;
  emoji: ReactionEmoji;
}): Promise<ReactionMap> => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  const commentRef = adminDb
    .collection("meals")
    .doc(mealId)
    .collection("comments")
    .doc(commentId);

  return adminDb.runTransaction(async (tx) => {
    const [mealSnap, commentSnap] = await Promise.all([tx.get(mealRef), tx.get(commentRef)]);
    if (!mealSnap.exists) {
      throw new RouteError("Meal not found", 404);
    }
    const mealData = mealSnap.data() as {
      userId?: unknown;
      userIds?: unknown;
    };
    assertMealVisibleToRole(mealData, actorRole);
    if (!commentSnap.exists) {
      throw new RouteError("Comment not found", 404);
    }

    const commentData = commentSnap.data() as {
      reactions?: unknown;
      authorUid?: unknown;
      text?: unknown;
    };
    const previousReactions = normalizeReactionMap(commentData.reactions);
    const hadReaction = previousReactions[emoji]?.includes(uid) ?? false;
    const nextReactions = toggleReactionInMap(previousReactions, emoji, uid);

    tx.update(commentRef, {
      reactions: nextReactions,
    });

    syncCommentReactionActivity({
      tx,
      mealId,
      commentId,
      commentAuthorUid:
        typeof commentData.authorUid === "string"
          ? commentData.authorUid
          : undefined,
      actorUid: uid,
      actorRole,
      emoji,
      preview: typeof commentData.text === "string" ? commentData.text : "",
      added: !hadReaction,
    });

    return nextReactions;
  });
};
