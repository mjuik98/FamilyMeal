import {
  addMealComment,
  deleteMealComment,
  updateMealComment,
} from "@/lib/client/comments";
import { subscribeToMealComments } from "@/lib/meal-comments-store";
import { isQaRuntimeActive } from "@/lib/qa/runtime";
import type { MealComment, UserRole } from "@/lib/types";

const normalizeCommentText = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Comment text is empty");
  }
  return trimmed;
};

export const watchMealCommentsForViewer = ({
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

export const createMealCommentForViewer = async ({
  mealId,
  authorRole,
  authorUid,
  text,
  parentId,
  mentionedAuthor,
}: {
  mealId: string;
  authorRole: UserRole;
  authorUid: string;
  text: string;
  parentId?: string;
  mentionedAuthor?: UserRole;
}): Promise<MealComment> => {
  const trimmed = normalizeCommentText(text);

  if (isQaRuntimeActive()) {
    const now = Date.now();
    return {
      id: `qa-comment-${now}`,
      author: authorRole,
      authorUid,
      text: trimmed,
      ...(parentId ? { parentId } : {}),
      ...(mentionedAuthor ? { mentionedAuthor } : {}),
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      reactions: {},
    };
  }

  return addMealComment(mealId, authorRole, authorUid, trimmed, { parentId });
};

export const updateMealCommentForViewer = async ({
  mealId,
  commentId,
  actorUid,
  text,
  existingComment,
}: {
  mealId: string;
  commentId: string;
  actorUid: string;
  text: string;
  existingComment: MealComment;
}): Promise<MealComment> => {
  const trimmed = normalizeCommentText(text);
  if (!actorUid) {
    throw new Error("Missing actor uid");
  }

  if (isQaRuntimeActive()) {
    const now = Date.now();
    return {
      ...existingComment,
      id: commentId,
      authorUid: actorUid,
      text: trimmed,
      updatedAt: now,
      timestamp: now,
    };
  }

  return updateMealComment(mealId, commentId, actorUid, trimmed);
};

export const deleteMealCommentForViewer = async ({
  mealId,
  commentId,
  actorUid,
}: {
  mealId: string;
  commentId: string;
  actorUid: string;
}): Promise<void> => {
  if (!actorUid) {
    throw new Error("Missing actor uid");
  }

  if (isQaRuntimeActive()) {
    return;
  }

  await deleteMealComment(mealId, commentId, actorUid);
};
