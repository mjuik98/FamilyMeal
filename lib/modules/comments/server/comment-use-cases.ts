import { USER_ROLES } from "@/lib/domain/meal-policy";
import {
  createStoredMealComment,
  deleteStoredMealCommentById,
  updateStoredMealCommentById,
} from "@/lib/modules/comments/adapters/firestore/comment-admin-store";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { UserRole } from "@/lib/types";

const VALID_ROLES = new Set(USER_ROLES);

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
}) =>
  createStoredMealComment({
    mealId,
    uid,
    actorRole,
    text,
    parentId,
  });

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
}) =>
  updateStoredMealCommentById({
    mealId,
    commentId,
    uid,
    text,
  });

export const deleteMealCommentById = async ({
  mealId,
  commentId,
  uid,
}: {
  mealId: string;
  commentId: string;
  uid: string;
}) =>
  deleteStoredMealCommentById({
    mealId,
    commentId,
    uid,
  });
