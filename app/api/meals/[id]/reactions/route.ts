import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { syncMealReactionActivity } from "@/lib/activity-log";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { ALLOWED_REACTION_EMOJIS, isReactionEmoji, normalizeReactionMap, toggleReactionInMap } from "@/lib/reactions";
import { getUserRole, verifyRequestUser } from "@/lib/server-auth";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["아빠", "엄마", "딸", "아들"]);

type Params = {
  id: string;
};

const ReactionSchema = z.object({
  emoji: z.string().trim().min(1),
});

const getMealId = async (params: Promise<Params>): Promise<string> => {
  const { id } = await params;
  let mealId = "";
  try {
    mealId = decodeURIComponent(id || "").trim();
  } catch {
    throw new RouteError("Invalid meal id", 400);
  }
  if (!mealId) {
    throw new RouteError("Invalid meal id", 400);
  }
  return mealId;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const user = await verifyRequestUser(request);
    const role = await getUserRole(user.uid);
    const mealId = await getMealId(context.params);

    if (!role || !VALID_ROLES.has(role)) {
      throw new RouteError("Valid user role is required", 403);
    }
    const actorRole = role as UserRole;

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

    const mealRef = adminDb.collection("meals").doc(mealId);
    const reactions = await adminDb.runTransaction(async (tx) => {
      const mealSnap = await tx.get(mealRef);
      if (!mealSnap.exists) {
        throw new RouteError("Meal not found", 404);
      }

      const mealData = mealSnap.data() as { reactions?: unknown; ownerUid?: unknown; description?: unknown };
      const previousReactions = normalizeReactionMap(mealData.reactions);
      const hadReaction = previousReactions[emoji]?.includes(user.uid) ?? false;
      const nextReactions = toggleReactionInMap(
        previousReactions,
        emoji,
        user.uid
      );

      tx.update(mealRef, {
        reactions: nextReactions,
      });

      syncMealReactionActivity({
        tx,
        mealId,
        mealOwnerUid: typeof mealData.ownerUid === "string" ? mealData.ownerUid : undefined,
        actorUid: user.uid,
        actorRole,
        emoji,
        preview: typeof mealData.description === "string" ? mealData.description : "",
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
