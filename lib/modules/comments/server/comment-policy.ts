import { z } from "zod";

import { MAX_COMMENT_LENGTH } from "@/lib/domain/meal-policy";
import { parseJsonBody } from "@/lib/platform/http/request-body";
import { RouteError } from "@/lib/platform/http/route-errors";

import type { CommentRouteParams } from "@/lib/modules/comments/server/comment-types";

export const CommentCreateSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
  parentId: z.string().trim().min(1).optional(),
});

export const CommentUpdateSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

const decodeParam = (value: string, label: string): string => {
  try {
    return decodeURIComponent(value || "").trim();
  } catch {
    throw new RouteError(`Invalid ${label}`, 400);
  }
};

export const getMealId = async (params: Promise<CommentRouteParams>): Promise<string> => {
  const { id } = await params;
  const mealId = decodeParam(id, "meal id");
  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }
  return mealId;
};

export const getCommentRouteParams = async (params: Promise<CommentRouteParams>) => {
  const { commentId } = await params;
  const mealId = await getMealId(params);
  const normalizedCommentId = decodeParam(commentId || "", "comment id");
  if (!normalizedCommentId) {
    throw new RouteError("Invalid comment id", 400);
  }
  return { mealId, commentId: normalizedCommentId };
};

export const parseCommentCreatePayload = async (request: Request) => {
  const parsed = await parseJsonBody(request, {
    schema: CommentCreateSchema,
  });

  return {
    text: parsed.text.trim(),
    parentId: parsed.parentId?.trim(),
  };
};

export const parseCommentUpdatePayload = async (request: Request) => {
  const parsed = await parseJsonBody(request, {
    schema: CommentUpdateSchema,
  });

  return {
    text: parsed.text.trim(),
  };
};
