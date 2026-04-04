import type { MealComment, UserRole } from "@/lib/types";
import {
  createMealCommentInRuntime,
  deleteMealCommentInRuntime,
  updateMealCommentInRuntime,
  watchMealCommentsForViewerInRuntime,
} from "@/lib/modules/comments/infrastructure/comment-runtime";
import type {
  CreateMealCommentCommand,
  DeleteMealCommentCommand,
  UpdateMealCommentCommand,
} from "@/lib/modules/comments/contracts";

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
  return watchMealCommentsForViewerInRuntime({
    mealId,
    fallbackComments,
    onComments,
    onError,
  });
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

  const command: CreateMealCommentCommand = {
    mealId,
    authorRole,
    authorUid,
    text: trimmed,
    parentId,
    mentionedAuthor,
  };

  return createMealCommentInRuntime(command);
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

  const command: UpdateMealCommentCommand = {
    mealId,
    commentId,
    actorUid,
    text: trimmed,
  };

  return updateMealCommentInRuntime(command, existingComment);
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

  const command: DeleteMealCommentCommand = {
    mealId,
    commentId,
    actorUid,
  };

  await deleteMealCommentInRuntime(command);
};
