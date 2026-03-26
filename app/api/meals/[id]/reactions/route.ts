import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { ALLOWED_REACTION_EMOJIS, isReactionEmoji, normalizeReactionMap, toggleReactionInMap } from "@/lib/reactions";
import { AuthError, getUserRole, verifyRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["아빠", "엄마", "딸", "아들"]);

type Params = {
  id: string;
};

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

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

const getErrorStatus = (error: unknown): number =>
  error instanceof AuthError
    ? error.status
    : error instanceof RouteError
      ? error.status
      : 500;

const getErrorMessage = (error: unknown): string =>
  error instanceof AuthError || error instanceof RouteError ? error.message : "internal error";

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

      const mealData = mealSnap.data() as { reactions?: unknown };
      const nextReactions = toggleReactionInMap(
        normalizeReactionMap(mealData.reactions),
        emoji,
        user.uid
      );

      tx.update(mealRef, {
        reactions: nextReactions,
      });

      return nextReactions;
    });

    return NextResponse.json({ ok: true, reactions });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
