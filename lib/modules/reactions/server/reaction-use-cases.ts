import { isUserRole } from "@/lib/domain/user-role";
import {
  toggleStoredCommentReactionForUser,
  toggleStoredMealReactionForUser,
} from "@/lib/modules/reactions/adapters/firestore/reaction-admin-store";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { ReactionEmoji, ReactionMap, UserRole } from "@/lib/types";

const assertActorRole = (role: string | null): UserRole => {
  if (!isUserRole(role)) {
    throw new RouteError("Valid user role is required", 403);
  }
  return role;
};

export const assertReactionActorRole = (role: string | null): UserRole =>
  assertActorRole(role);

export const toggleMealReactionForUser = async ({
  mealId,
  uid,
  actorRole,
  emoji,
}: {
  mealId: string;
  uid: string;
  actorRole: UserRole;
  emoji: ReactionEmoji;
}): Promise<ReactionMap> =>
  toggleStoredMealReactionForUser({
    mealId,
    uid,
    actorRole,
    emoji,
  });

export const toggleCommentReactionForUser = async ({
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
}): Promise<ReactionMap> =>
  toggleStoredCommentReactionForUser({
    mealId,
    commentId,
    uid,
    actorRole,
    emoji,
  });
