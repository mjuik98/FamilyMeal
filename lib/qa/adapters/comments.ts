import type { MealComment } from "@/lib/types";

import type {
  CreateMealCommentCommand,
  UpdateMealCommentCommand,
} from "@/lib/modules/comments/contracts";
import { isQaMockMode } from "@/lib/qa/mode";

export const isQaCommentRuntimeActive = (): boolean => isQaMockMode();

export const watchQaMealComments = ({
  fallbackComments = [],
  onComments,
}: {
  mealId: string;
  fallbackComments?: MealComment[];
  onComments: (comments: MealComment[]) => void;
}) => {
  onComments(fallbackComments);
  return () => undefined;
};

export const createQaMealComment = async (
  command: CreateMealCommentCommand
): Promise<MealComment> => {
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
};

export const updateQaMealComment = async (
  command: UpdateMealCommentCommand,
  existingComment: MealComment
): Promise<MealComment> => {
  const now = Date.now();
  return {
    ...existingComment,
    id: command.commentId,
    authorUid: command.actorUid,
    text: command.text,
    updatedAt: now,
    timestamp: now,
  };
};

export const deleteQaMealComment = async (): Promise<void> => undefined;
