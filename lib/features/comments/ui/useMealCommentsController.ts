"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createMealCommentForViewer,
  deleteMealCommentForViewer,
  updateMealCommentForViewer,
  watchMealCommentsForViewer,
} from "@/lib/features/comments/application/meal-comment-service";
import type { ReplyTarget } from "@/lib/features/comments/ui/types";
import { logError } from "@/lib/logging";
import { getErrorCode } from "@/lib/platform/errors/error-contract";
import type { Meal, MealComment, UserProfile } from "@/lib/types";

type ToastFn = (
  message: string,
  type?: "success" | "error" | "info",
  position?: "top" | "center"
) => void;

const toCommentCreateErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message.trim() : "";
  const code = getErrorCode(error);

  if (code === "not_allowed" || raw === "Not allowed") {
    return "이 식사 참여자만 댓글을 작성할 수 있어요.";
  }
  if (
    code === "valid_user_role_required" ||
    code === "user_profile_required" ||
    raw === "Valid user role is required" ||
    raw === "User profile is required"
  ) {
    return "프로필에서 역할을 먼저 설정해 주세요.";
  }
  if (code === "parent_comment_not_found" || raw === "Parent comment not found") {
    return "답글 대상 댓글을 찾지 못했습니다.";
  }
  if (code === "nested_replies_not_supported" || raw === "Nested replies are not supported") {
    return "답글에는 다시 답글을 달 수 없어요.";
  }
  if (
    code === "server_allowlist_not_configured" ||
    code === "server_auth_not_configured" ||
    code === "server_firebase_project_mismatch" ||
    raw === "Server allowlist is not configured" ||
    raw === "Server auth is not configured" ||
    raw === "Server Firebase project mismatch"
  ) {
    return "서버 인증 설정을 확인해 주세요.";
  }
  if (
    code === "missing_bearer_token" ||
    code === "empty_bearer_token" ||
    code === "invalid_auth_token" ||
    code === "auth_token_expired" ||
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

export const useMealCommentsController = ({
  meal,
  commentsOpen,
  userProfile,
  showToast,
}: {
  meal: Meal;
  commentsOpen: boolean;
  userProfile?: UserProfile | null;
  showToast: ToastFn;
}) => {
  const [comments, setComments] = useState<MealComment[]>(meal.comments ?? []);
  const [commentCount, setCommentCount] = useState(
    meal.commentCount ?? meal.comments?.length ?? 0
  );
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
    if (!commentsOpen) {
      setComments([]);
      setReplyTarget(null);
      return;
    }

    const fallbackComments = meal.comments ?? [];
    setCommentCount(meal.commentCount ?? fallbackComments.length);
    return watchMealCommentsForViewer({
      mealId: meal.id,
      fallbackComments,
      onError: () => {
        // Preserve local state when the subscription fails.
      },
      onComments: (nextComments) => {
        if (nextComments.length === 0 && fallbackComments.length > 0) {
          setComments(fallbackComments);
          setCommentCount(fallbackComments.length);
          return;
        }

        setComments(nextComments);
        setCommentCount(nextComments.length);
      },
    });
  }, [commentsOpen, meal.commentCount, meal.comments, meal.id]);

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

    setIsSubmittingComment(true);
    setCommentText("");
    setComments((prev) => [...prev, optimisticComment]);
    setCommentCount((prev) => prev + 1);

    try {
      const created = await createMealCommentForViewer({
        mealId: meal.id,
        authorRole: userProfile.role,
        authorUid: userProfile.uid,
        text: trimmed,
        parentId: replyTarget?.id,
        mentionedAuthor: replyTarget?.author,
      });
      setComments((prev) =>
        prev.map((comment) => (comment.id === optimisticId ? created : comment))
      );
      setReplyTarget(null);
      showToast("댓글이 등록되었습니다.", "success");
    } catch (error) {
      logError("Failed to add comment", error);
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
      setCommentCount((prev) => Math.max(0, prev - 1));
      setCommentText(trimmed);
      showToast(
        `댓글 등록에 실패했습니다. ${toCommentCreateErrorMessage(error)}`,
        "error",
        "center"
      );
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
    let existingComment: MealComment | undefined;
    const now = Date.now();

    setComments((prev) => {
      previous = prev;
      existingComment = prev.find((comment) => comment.id === commentId);
      return prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, text: trimmed, updatedAt: now, timestamp: now }
          : comment
      );
    });

    if (!existingComment) {
      setComments(previous);
      return;
    }

    setCommentActionId(commentId);
    try {
      const updated = await updateMealCommentForViewer({
        mealId: meal.id,
        commentId,
        actorUid: userProfile.uid,
        text: trimmed,
        existingComment,
      });
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? updated : comment))
      );
      cancelEditingComment();
      showToast("댓글이 수정되었습니다.", "success");
    } catch (error) {
      logError("Failed to update comment", error);
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

    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.filter((comment) => comment.id !== commentId);
    });
    setCommentCount((prev) => Math.max(0, prev - 1));

    setCommentActionId(commentId);
    try {
      await deleteMealCommentForViewer({
        mealId: meal.id,
        commentId,
        actorUid: userProfile.uid,
      });
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      showToast("댓글이 삭제되었습니다.", "success");
    } catch (error) {
      logError("Failed to delete comment", error);
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

  return {
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
  };
};

export { useMealCommentsController as useMealComments };
