import { z } from "zod";

import { ALLOWED_REACTION_EMOJIS, isReactionEmoji } from "@/lib/reactions";
import { RouteError } from "@/lib/platform/http/route-errors";
import type { ReactionEmoji } from "@/lib/types";

const ReactionSchema = z.object({
  emoji: z.string().trim().min(1),
});

const decodeParam = (value: string, label: string): string => {
  try {
    return decodeURIComponent(value || "").trim();
  } catch {
    throw new RouteError(`Invalid ${label}`, 400);
  }
};

export const parseReactionPayload = async (
  request: Request
): Promise<{ emoji: ReactionEmoji }> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RouteError("Invalid JSON body", 400);
  }

  const parsed = ReactionSchema.safeParse(body);
  if (!parsed.success) {
    throw new RouteError("Invalid payload", 400);
  }

  const emoji = parsed.data.emoji;
  if (!isReactionEmoji(emoji)) {
    throw new RouteError(
      `Invalid reaction emoji. Allowed: ${ALLOWED_REACTION_EMOJIS.join(", ")}`,
      400
    );
  }

  return { emoji };
};

export const getMealReactionMealId = async (
  params: Promise<{ id: string }>
): Promise<string> => {
  const { id } = await params;
  const mealId = decodeParam(id, "meal id");
  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }
  return mealId;
};

export const getCommentReactionRouteParams = async (
  params: Promise<{ id: string; commentId: string }>
) => {
  const { id, commentId } = await params;
  const mealId = decodeParam(id, "meal id");
  const normalizedCommentId = decodeParam(commentId, "comment id");

  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }

  if (!normalizedCommentId) {
    throw new RouteError("Invalid comment id", 400);
  }

  return { mealId, commentId: normalizedCommentId };
};
