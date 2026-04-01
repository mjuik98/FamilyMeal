"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/context/UserContext";
import { deleteMeal } from "@/lib/client/meals";
import type { Meal } from "@/lib/types";
import { useMealComments } from "@/components/hooks/useMealComments";
import { useMealReactions } from "@/components/hooks/useMealReactions";

import { useConfirm } from "./ConfirmDialog";
import MealConversationPanel from "./meal-detail/MealConversationPanel";
import MealDetailSummary from "./meal-detail/MealDetailSummary";
import MealPhotoStage from "./meal-detail/MealPhotoStage";
import { useToast } from "./Toast";

export default function MealCard({
  meal,
  sameDayMeals = [],
  onSelectMeal,
}: {
  meal: Meal;
  sameDayMeals?: Meal[];
  onSelectMeal?: (mealId: string) => void;
}) {
  const { userProfile } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [commentsOpen, setCommentsOpen] = useState(true);

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

  const uids = useMemo(
    () => meal.userIds || (meal.userId ? [meal.userId] : []),
    [meal.userId, meal.userIds]
  );

  const isOwner = useMemo(() => {
    if (!userProfile) return false;
    if (meal.ownerUid) return meal.ownerUid === userProfile.uid;
    return Boolean(userProfile.role && uids.length > 0 && uids[0] === userProfile.role);
  }, [meal.ownerUid, uids, userProfile]);

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: "식사 기록 삭제",
      message: "이 식사 기록을 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await deleteMeal(meal.id);
      showToast("삭제되었습니다.", "success");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete meal", error);
      showToast("삭제에 실패했습니다.", "error");
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
