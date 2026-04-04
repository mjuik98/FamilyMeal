import {
  addMealComment,
  deleteMealComment,
  updateMealComment,
} from "@/lib/client/comments";
import { subscribeToMealComments } from "@/lib/meal-comments-store";
import type { MealComment } from "@/lib/types";

import type {
  CreateMealCommentCommand,
  DeleteMealCommentCommand,
  UpdateMealCommentCommand,
} from "@/lib/modules/comments/contracts";
import {
  createQaMealComment,
  deleteQaMealComment,
  isQaCommentRuntimeActive,
  updateQaMealComment,
  watchQaMealComments,
} from "@/lib/qa/adapters/comments";

export const watchMealCommentsForViewerInRuntime = ({
  mealId,
  fallbackComments = [],
  onComments,
  onError,
}: {
  mealId: string;
  fallbackComments?: MealComment[];
  onComments: (comments: MealComment[]) => void;
  onError?: (error: Error) => void;
}) => {
  if (isQaCommentRuntimeActive()) {
    return watchQaMealComments({
      mealId,
      fallbackComments,
      onComments,
    });
  }

  return subscribeToMealComments(
    mealId,
    {
      fallbackComments,
      onError,
    },
    onComments
  );
};

export const createMealCommentInRuntime = async (
  command: CreateMealCommentCommand
): Promise<MealComment> => {
  if (isQaCommentRuntimeActive()) {
    return createQaMealComment(command);
  }

  return addMealComment(
    command.mealId,
    command.authorRole,
    command.authorUid,
    command.text,
    { parentId: command.parentId }
  );
};

export const updateMealCommentInRuntime = async (
  command: UpdateMealCommentCommand,
  existingComment: MealComment
): Promise<MealComment> => {
  if (isQaCommentRuntimeActive()) {
    return updateQaMealComment(command, existingComment);
  }

  return updateMealComment(
    command.mealId,
    command.commentId,
    command.actorUid,
    command.text
  );
};

export const deleteMealCommentInRuntime = async (
  command: DeleteMealCommentCommand
): Promise<void> => {
  if (isQaCommentRuntimeActive()) {
    return deleteQaMealComment();
  }

  await deleteMealComment(command.mealId, command.commentId, command.actorUid);
};
