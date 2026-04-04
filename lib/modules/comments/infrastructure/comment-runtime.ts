import {
  addMealComment,
  deleteMealComment,
  updateMealComment,
} from "@/lib/client/comments";
import { subscribeToMealComments } from "@/lib/meal-comments-store";
import { isQaRuntimeActive } from "@/lib/qa/runtime";
import type { MealComment } from "@/lib/types";

import type {
  CreateMealCommentCommand,
  DeleteMealCommentCommand,
  UpdateMealCommentCommand,
} from "@/lib/modules/comments/contracts";

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
  if (isQaRuntimeActive()) {
    onComments(fallbackComments);
    return () => undefined;
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
  if (isQaRuntimeActive()) {
    const now = Date.now();
    return {
      id: `qa-comment-${now}`,
      author: command.authorRole,
      authorUid: command.authorUid,
      text: command.text,
      ...(command.parentId ? { parentId: command.parentId } : {}),
      ...(command.mentionedAuthor
        ? { mentionedAuthor: command.mentionedAuthor }
        : {}),
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      reactions: {},
    };
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
  if (isQaRuntimeActive()) {
    const now = Date.now();
    return {
      ...existingComment,
      id: command.commentId,
      authorUid: command.actorUid,
      text: command.text,
      updatedAt: now,
      timestamp: now,
    };
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
  if (isQaRuntimeActive()) {
    return;
  }

  await deleteMealComment(command.mealId, command.commentId, command.actorUid);
};
