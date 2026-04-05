"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/context/UserContext";
import {
  deleteMealRecord,
  type MealDeleteResult,
} from "@/lib/features/meals/application/meal-editor-service";
import { useMealCommentsController as useMealComments } from "@/lib/features/comments/ui/useMealCommentsController";
import { useMealReactionsController as useMealReactions } from "@/lib/features/reactions/ui/useMealReactionsController";
import { logError } from "@/lib/logging";
import { toMealDeleteErrorMessage } from "@/lib/modules/meals/ui/meal-error-messages";
import type { Meal } from "@/lib/types";

import { useConfirm } from "./ConfirmDialog";
import MealConversationPanel from "./meal-detail/MealConversationPanel";
import MealDetailSummary from "./meal-detail/MealDetailSummary";
import MealPhotoStage from "./meal-detail/MealPhotoStage";
import { useToast } from "./Toast";

export default function MealCard({
  meal,
  sameDayMeals = [],
  onSelectMeal,
  onDeleted,
}: {
  meal: Meal;
  sameDayMeals?: Meal[];
  onSelectMeal?: (mealId: string) => void;
  onDeleted?: (result: MealDeleteResult) => void;
}) {
  const { userProfile } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    comments,
    setComments,
    commentCount,
    commentThreads,
    commentText,
    setCommentText,
    isSubmittingComment,
    editingCommentId,
    editingText,
    setEditingText,
    commentActionId,
    replyTarget,
    setReplyTarget,
    handleAddComment,
    startEditingComment,
    cancelEditingComment,
    handleSaveComment,
    handleDeleteComment,
  } = useMealComments({
    meal,
    commentsOpen,
    userProfile,
    showToast,
  });

  const {
    mealReactions,
    pendingMealReaction,
    pendingCommentReactionId,
    handleToggleMealReaction,
    handleToggleCommentReaction,
  } = useMealReactions({
    meal,
    userUid: userProfile?.uid,
    setComments,
    showToast,
  });

  const isOwner = useMemo(() => {
    if (!userProfile) return false;
    return Boolean(meal.ownerUid && meal.ownerUid === userProfile.uid);
  }, [meal.ownerUid, userProfile]);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const confirmed = await showConfirm({
        title: "식사 기록 삭제",
        message: "이 식사 기록을 삭제하시겠습니까?",
        confirmText: "삭제",
        cancelText: "취소",
        danger: true,
      });
      if (!confirmed) return;

      const result = await deleteMealRecord(meal.id);
      switch (result.status) {
        case "already_processing":
          showToast("삭제 작업이 이미 진행 중입니다.", "info");
          return;
        case "already_deleted":
          showToast("이미 삭제된 기록입니다.", "success");
          onDeleted?.(result);
          if (!onDeleted) {
            router.refresh();
          }
          return;
        case "completed":
          showToast("삭제되었습니다.", "success");
          onDeleted?.(result);
          if (!onDeleted) {
            router.refresh();
          }
          return;
      }
    } catch (error) {
      logError("Failed to delete meal", error);
      showToast(toMealDeleteErrorMessage(error), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCommentWithConfirm = async (commentId: string) => {
    if (comments.some((comment) => comment.parentId === commentId)) {
      showToast("답글이 있는 댓글은 먼저 답글을 삭제해 주세요.", "error");
      return;
    }

    const confirmed = await showConfirm({
      title: "댓글 삭제",
      message: "이 댓글을 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      danger: true,
    });
    if (!confirmed) return;

    await handleDeleteComment(commentId);
  };

  return (
    <article className="meal-card surface-card" data-testid={`meal-card-${meal.id}`}>
      <MealPhotoStage meal={meal} sameDayMeals={sameDayMeals} onSelectMeal={onSelectMeal} />

      <div className="meal-card-body meal-card-body-detail">
        <MealDetailSummary
          meal={meal}
          isOwner={isOwner}
          deleteDisabled={isDeleting}
          onEdit={() => router.push(`/edit/${meal.id}`)}
          onDelete={() => void handleDelete()}
        />

        <MealConversationPanel
          mealReactions={mealReactions}
          currentUid={userProfile?.uid}
          pendingMealReaction={pendingMealReaction}
          commentCount={commentCount}
          commentsOpen={commentsOpen}
          commentThreads={commentThreads}
          commentText={commentText}
          replyTarget={replyTarget}
          editingCommentId={editingCommentId}
          editingText={editingText}
          commentActionId={commentActionId}
          pendingCommentReactionId={pendingCommentReactionId}
          isSubmittingComment={isSubmittingComment}
          onToggleComments={() => setCommentsOpen((prev) => !prev)}
          onToggleMealReaction={(emoji) => void handleToggleMealReaction(emoji)}
          onReply={setReplyTarget}
          onStartEdit={startEditingComment}
          onDelete={(commentId) => void handleDeleteCommentWithConfirm(commentId)}
          onEditingTextChange={setEditingText}
          onSave={(commentId) => void handleSaveComment(commentId)}
          onCancelEdit={cancelEditingComment}
          onToggleReaction={(commentId, emoji) =>
            void handleToggleCommentReaction(commentId, emoji)
          }
          onCommentTextChange={setCommentText}
          onSubmitComment={() => void handleAddComment()}
          onClearReplyTarget={() => setReplyTarget(null)}
        />
      </div>
    </article>
  );
}
