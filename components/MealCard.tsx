"use client";

import { Meal, MealComment, ReactionEmoji } from "@/lib/types";
import { useUser } from "@/context/UserContext";
import {
  addMealComment,
  deleteMeal,
  deleteMealComment,
  subscribeMealComments,
  toggleMealCommentReaction,
  toggleMealReaction,
  updateMealComment,
} from "@/lib/data";
import { normalizeReactionMap, toggleReactionInMap } from "@/lib/reactions";
import { isQaMockMode } from "@/lib/qa";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import type { ReplyTarget } from "./comments/CommentComposer";
import MealConversationPanel from "./meal-detail/MealConversationPanel";
import MealDetailSummary from "./meal-detail/MealDetailSummary";
import MealPhotoStage from "./meal-detail/MealPhotoStage";

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

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<MealComment[]>(meal.comments ?? []);
  const [commentCount, setCommentCount] = useState(meal.commentCount ?? meal.comments?.length ?? 0);
  const [mealReactions, setMealReactions] = useState(normalizeReactionMap(meal.reactions));
  const [pendingMealReaction, setPendingMealReaction] = useState<ReactionEmoji | null>(null);
  const [pendingCommentReactionId, setPendingCommentReactionId] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    setCommentCount(meal.commentCount ?? meal.comments?.length ?? 0);
  }, [meal.commentCount, meal.comments]);

  useEffect(() => {
    setMealReactions(normalizeReactionMap(meal.reactions));
  }, [meal.reactions]);

  useEffect(() => {
    if (!commentsOpen) {
      setComments([]);
      setReplyTarget(null);
      return;
    }

    const fallbackComments = meal.comments ?? [];
    setComments(fallbackComments);
    setCommentCount(meal.commentCount ?? fallbackComments.length);

    if (isQaMockMode()) {
      return;
    }

    const unsubscribe = subscribeMealComments(
      meal.id,
      (nextComments) => {
        if (nextComments.length === 0 && (meal.comments?.length ?? 0) > 0) {
          setComments(meal.comments ?? []);
          setCommentCount(meal.comments?.length ?? 0);
          return;
        }
        setComments(nextComments);
        setCommentCount(nextComments.length);
      },
      () => {
        // Keep the latest local state when subscription fails.
      }
    );

    return () => unsubscribe();
  }, [commentsOpen, meal.commentCount, meal.comments, meal.id]);

  const uids = useMemo(
    () => meal.userIds || (meal.userId ? [meal.userId] : []),
    [meal.userId, meal.userIds]
  );

  const isOwner = useMemo(() => {
    if (!userProfile) return false;
    if (meal.ownerUid) return meal.ownerUid === userProfile.uid;
    return Boolean(userProfile.role && uids.length > 0 && uids[0] === userProfile.role);
  }, [meal.ownerUid, uids, userProfile]);

  const commentThreads = useMemo(() => {
    const topLevel = comments
      .filter((comment) => !comment.parentId)
      .sort((a, b) => a.createdAt - b.createdAt);
    const replyMap = new Map<string, MealComment[]>();

    comments
      .filter((comment) => typeof comment.parentId === "string")
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((reply) => {
        const parentId = reply.parentId as string;
        const bucket = replyMap.get(parentId) ?? [];
        bucket.push(reply);
        replyMap.set(parentId, bucket);
      });

    return topLevel.map((parent) => ({
      parent,
      replies: replyMap.get(parent.id) ?? [],
    }));
  }, [comments]);

  const toCommentCreateErrorMessage = (error: unknown): string => {
    const raw = error instanceof Error ? error.message.trim() : "";

    if (raw === "Not allowed") {
      return "이 식사 참여자만 댓글을 작성할 수 있어요.";
    }
    if (raw === "Valid user role is required" || raw === "User profile is required") {
      return "프로필에서 역할을 먼저 설정해 주세요.";
    }
    if (raw === "Parent comment not found") {
      return "답글 대상 댓글을 찾지 못했습니다.";
    }
    if (raw === "Nested replies are not supported") {
      return "답글에는 다시 답글을 달 수 없어요.";
    }
    if (
      raw === "Server allowlist is not configured" ||
      raw === "Server auth is not configured" ||
      raw === "Server Firebase project mismatch"
    ) {
      return "서버 인증 설정을 확인해 주세요.";
    }
    if (
      raw === "Missing bearer token" ||
      raw === "Empty bearer token" ||
      raw === "Invalid auth token" ||
      raw === "Auth token expired"
    ) {
      return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    }
    if (raw.length > 0 && raw !== "internal error") {
      return raw;
    }
    return "잠시 후 다시 시도해 주세요.";
  };

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

  const handleEdit = () => {
    router.push(`/edit/${meal.id}`);
  };

  const handleAddComment = async () => {
    if (!commentsOpen) return;
    if (!userProfile?.role || !userProfile.uid) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const now = Date.now();
    const optimisticComment: MealComment = {
      id: optimisticId,
      author: userProfile.role,
      authorUid: userProfile.uid,
      text: trimmed,
      parentId: replyTarget?.id,
      mentionedAuthor: replyTarget?.author,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      reactions: {},
    };

    if (isQaMockMode()) {
      setCommentText("");
      setComments((prev) => [...prev, optimisticComment]);
      setCommentCount((prev) => prev + 1);
      setReplyTarget(null);
      showToast("댓글이 등록되었습니다.", "success");
      return;
    }

    setIsSubmittingComment(true);
    setCommentText("");
    setComments((prev) => [...prev, optimisticComment]);
    setCommentCount((prev) => prev + 1);

    try {
      const created = await addMealComment(
        meal.id,
        userProfile.role,
        userProfile.uid,
        trimmed,
        { parentId: replyTarget?.id }
      );
      setComments((prev) => prev.map((comment) => (comment.id === optimisticId ? created : comment)));
      setReplyTarget(null);
      showToast("댓글이 등록되었습니다.", "success");
    } catch (error) {
      console.error("Failed to add comment", error);
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
      setCommentCount((prev) => Math.max(0, prev - 1));
      setCommentText(trimmed);
      showToast(`댓글 등록에 실패했습니다. ${toCommentCreateErrorMessage(error)}`, "error", "center");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startEditingComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(currentText);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleSaveComment = async (commentId: string) => {
    if (!userProfile?.role || !userProfile.uid) return;

    const trimmed = editingText.trim();
    if (!trimmed) return;

    let previous: MealComment[] = [];
    const now = Date.now();

    setComments((prev) => {
      previous = prev;
      return prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, text: trimmed, updatedAt: now, timestamp: now }
          : comment
      );
    });

    if (isQaMockMode()) {
      cancelEditingComment();
      showToast("댓글이 수정되었습니다.", "success");
      return;
    }

    setCommentActionId(commentId);
    try {
      const updated = await updateMealComment(meal.id, commentId, userProfile.uid, trimmed);
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)));
      cancelEditingComment();
      showToast("댓글이 수정되었습니다.", "success");
    } catch (error) {
      console.error("Failed to update comment", error);
      setComments(previous);
      showToast("댓글 수정에 실패했습니다.", "error");
    } finally {
      setCommentActionId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!userProfile?.role || !userProfile.uid) return;

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

    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.filter((comment) => comment.id !== commentId);
    });
    setCommentCount((prev) => Math.max(0, prev - 1));

    if (isQaMockMode()) {
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      showToast("댓글이 삭제되었습니다.", "success");
      return;
    }

    setCommentActionId(commentId);
    try {
      await deleteMealComment(meal.id, commentId, userProfile.uid);
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      showToast("댓글이 삭제되었습니다.", "success");
    } catch (error) {
      console.error("Failed to delete comment", error);
      setComments(previous);
      setCommentCount(previous.length);
      showToast(
        error instanceof Error && error.message === "Reply comments exist"
          ? "답글이 있는 댓글은 먼저 답글을 삭제해 주세요."
          : "댓글 삭제에 실패했습니다.",
        "error"
      );
    } finally {
      setCommentActionId(null);
    }
  };

  const handleToggleMealReaction = async (emoji: ReactionEmoji) => {
    if (!userProfile?.uid) return;

    const previous = mealReactions;
    const next = toggleReactionInMap(previous, emoji, userProfile.uid);
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

  const handleToggleCommentReaction = async (commentId: string, emoji: ReactionEmoji) => {
    if (!userProfile?.uid) return;

    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, reactions: toggleReactionInMap(comment.reactions ?? {}, emoji, userProfile.uid) }
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
          comment.id === commentId ? { ...comment, reactions: serverReactions } : comment
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

  const formatRelativeTime = (timestamp: number): string => {
    const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

    if (abs < 60) return rtf.format(Math.trunc(diffSeconds), "second");
    if (abs < 3600) return rtf.format(Math.trunc(diffSeconds / 60), "minute");
    if (abs < 86400) return rtf.format(Math.trunc(diffSeconds / 3600), "hour");
    if (abs < 604800) return rtf.format(Math.trunc(diffSeconds / 86400), "day");
    if (abs < 2592000) return rtf.format(Math.trunc(diffSeconds / 604800), "week");
    if (abs < 31536000) return rtf.format(Math.trunc(diffSeconds / 2592000), "month");
    return rtf.format(Math.trunc(diffSeconds / 31536000), "year");
  };

  return (
    <article className="meal-card surface-card" data-testid={`meal-card-${meal.id}`}>
      <MealPhotoStage meal={meal} sameDayMeals={sameDayMeals} onSelectMeal={onSelectMeal} />

      <div className="meal-card-body meal-card-body-detail">
        <MealDetailSummary
          meal={meal}
          isOwner={isOwner}
          onEdit={handleEdit}
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
          onDelete={(commentId) => void handleDeleteComment(commentId)}
          onEditingTextChange={setEditingText}
          onSave={(commentId) => void handleSaveComment(commentId)}
          onCancelEdit={cancelEditingComment}
          onToggleReaction={(commentId, emoji) => void handleToggleCommentReaction(commentId, emoji)}
          onCommentTextChange={setCommentText}
          onSubmitComment={() => void handleAddComment()}
          onClearReplyTarget={() => setReplyTarget(null)}
          formatRelativeTime={formatRelativeTime}
        />
      </div>
    </article>
  );
}
