import { NextResponse } from "next/server";
import { z } from "zod";

import { isUserRole } from "@/lib/domain/meal-policy";
import { adminDb } from "@/lib/firebase-admin";
import { syncCommentReactionActivity } from "@/lib/activity-log";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { ALLOWED_REACTION_EMOJIS, isReactionEmoji, normalizeReactionMap, toggleReactionInMap } from "@/lib/reactions";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
  commentId: string;
};

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

const getRouteParams = async (params: Promise<Params>) => {
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

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const role = await getUserRole(user.uid);
    const { mealId, commentId } = await getRouteParams(context.params);

    if (!isUserRole(role)) {
      throw new RouteError("Valid user role is required", 403);
    }
    const actorRole = role;

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
      throw new RouteError(`Invalid reaction emoji. Allowed: ${ALLOWED_REACTION_EMOJIS.join(", ")}`, 400);
    }

    const commentRef = adminDb.collection("meals").doc(mealId).collection("comments").doc(commentId);
    const reactions = await adminDb.runTransaction(async (tx) => {
      const commentSnap = await tx.get(commentRef);
      if (!commentSnap.exists) {
        throw new RouteError("Comment not found", 404);
      }

      const commentData = commentSnap.data() as { reactions?: unknown; authorUid?: unknown; text?: unknown };
      const previousReactions = normalizeReactionMap(commentData.reactions);
      const hadReaction = previousReactions[emoji]?.includes(user.uid) ?? false;
      const nextReactions = toggleReactionInMap(
        previousReactions,
        emoji,
        user.uid
      );

      tx.update(commentRef, {
        reactions: nextReactions,
      });

      syncCommentReactionActivity({
        tx,
        mealId,
        commentId,
        commentAuthorUid: typeof commentData.authorUid === "string" ? commentData.authorUid : undefined,
        actorUid: user.uid,
        actorRole,
        emoji,
        preview: typeof commentData.text === "string" ? commentData.text : "",
        added: !hadReaction,
      });

      return nextReactions;
    });

    return NextResponse.json({ ok: true, reactions });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
