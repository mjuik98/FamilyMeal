import type { UserRole } from "@/lib/types";

export type CreateMealCommentCommand = {
  mealId: string;
  authorRole: UserRole;
  authorUid: string;
  text: string;
  parentId?: string;
  mentionedAuthor?: UserRole;
};

export type UpdateMealCommentCommand = {
  mealId: string;
  commentId: string;
  actorUid: string;
  text: string;
};

export type DeleteMealCommentCommand = {
  mealId: string;
  commentId: string;
  actorUid: string;
};
