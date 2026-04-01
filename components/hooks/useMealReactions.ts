"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

import {
  toggleMealCommentReaction,
  toggleMealReaction,
} from "@/lib/data";
import { isQaMockMode } from "@/lib/qa";
import { normalizeReactionMap, toggleReactionInMap } from "@/lib/reactions";
import type { Meal, MealComment, ReactionEmoji } from "@/lib/types";

type ToastFn = (
  message: string,
  type?: "success" | "error" | "info",
  position?: "top" | "center"
) => void;

export const useMealReactions = ({
  meal,
  userUid,
  setComments,
  showToast,
}: {
  meal: Meal;
  userUid?: string;
  setComments: Dispatch<SetStateAction<MealComment[]>>;
  showToast: ToastFn;
}) => {
  const [mealReactions, setMealReactions] = useState(
    normalizeReactionMap(meal.reactions)
  );
  const [pendingMealReaction, setPendingMealReaction] =
    useState<ReactionEmoji | null>(null);
  const [pendingCommentReactionId, setPendingCommentReactionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setMealReactions(normalizeReactionMap(meal.reactions));
  }, [meal.reactions]);

  const handleToggleMealReaction = async (emoji: ReactionEmoji) => {
    if (!userUid) return;

    const previous = mealReactions;
    const next = toggleReactionInMap(previous, emoji, userUid);
    setMealReactions(next);

    if (isQaMockMode()) {
      return;
    }

    setPendingMealReaction(emoji);
    try {
      const serverReactions = await toggleMealReaction(meal.id, emoji);
      setMealReactions(serverReactions);
    } catch (error) {
      console.error("Failed to toggle meal reaction", error);
      setMealReactions(previous);
      showToast("반응 등록에 실패했습니다.", "error");
    } finally {
      setPendingMealReaction(null);
    }
  };

  const handleToggleCommentReaction = async (
    commentId: string,
    emoji: ReactionEmoji
  ) => {
    if (!userUid) return;

    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              reactions: toggleReactionInMap(
                comment.reactions ?? {},
                emoji,
                userUid
              ),
            }
          : comment
      );
    });

    if (isQaMockMode()) {
      return;
    }

    setPendingCommentReactionId(commentId);
    try {
      const serverReactions = await toggleMealCommentReaction(meal.id, commentId, emoji);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, reactions: serverReactions }
            : comment
        )
      );
    } catch (error) {
      console.error("Failed to toggle comment reaction", error);
      setComments(previous);
      showToast("댓글 반응 등록에 실패했습니다.", "error");
    } finally {
      setPendingCommentReactionId(null);
    }
  };

  return {
    mealReactions,
    pendingMealReaction,
    pendingCommentReactionId,
    handleToggleMealReaction,
    handleToggleCommentReaction,
  };
};
