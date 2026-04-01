import { z } from "zod";

import { MAX_COMMENT_LENGTH } from "@/lib/domain/meal-policy";
import { RouteError } from "@/lib/route-errors";

import type { CommentRouteParams } from "@/lib/server/comments/comment-types";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RouteError("Invalid JSON body", 400);
  }

  const parsed = CommentCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new RouteError("Invalid payload", 400);
  }

  return {
    text: parsed.data.text.trim(),
    parentId: parsed.data.parentId?.trim(),
  };
};

export const parseCommentUpdatePayload = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RouteError("Invalid JSON body", 400);
  }

  const parsed = CommentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new RouteError("Invalid payload", 400);
  }

  return {
    text: parsed.data.text.trim(),
  };
};
