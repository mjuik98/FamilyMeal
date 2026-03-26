"use client";

import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

import ReactionBar from "@/components/ReactionBar";
import CommentComposer, { type ReplyTarget } from "@/components/comments/CommentComposer";
import CommentThread from "@/components/comments/CommentThread";
import type { MealComment, ReactionEmoji, ReactionMap } from "@/lib/types";

export default function MealConversationPanel({
  mealReactions,
  currentUid,
  pendingMealReaction,
  commentCount,
  commentsOpen,
  commentThreads,
  commentText,
  replyTarget,
  editingCommentId,
  editingText,
  commentActionId,
  pendingCommentReactionId,
  isSubmittingComment,
  onToggleComments,
  onToggleMealReaction,
  onReply,
  onStartEdit,
  onDelete,
  onEditingTextChange,
  onSave,
  onCancelEdit,
  onToggleReaction,
  onCommentTextChange,
  onSubmitComment,
  onClearReplyTarget,
  formatRelativeTime,
}: {
  mealReactions: ReactionMap;
  currentUid?: string;
  pendingMealReaction: ReactionEmoji | null;
  commentCount: number;
  commentsOpen: boolean;
  commentThreads: Array<{ parent: MealComment; replies: MealComment[] }>;
  commentText: string;
  replyTarget: ReplyTarget | null;
  editingCommentId: string | null;
  editingText: string;
  commentActionId: string | null;
  pendingCommentReactionId: string | null;
  isSubmittingComment: boolean;
  onToggleComments: () => void;
  onToggleMealReaction: (emoji: ReactionEmoji) => void;
  onReply: (target: ReplyTarget | null) => void;
  onStartEdit: (commentId: string, currentText: string) => void;
  onDelete: (commentId: string) => void;
  onEditingTextChange: (value: string) => void;
  onSave: (commentId: string) => void;
  onCancelEdit: () => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: () => void;
  onClearReplyTarget: () => void;
  formatRelativeTime: (timestamp: number) => string;
}) {
  return (
    <section className="meal-conversation-panel surface-card" data-testid="meal-conversation-panel">
      <div className="surface-body page-stack-gap-sm">
        <ReactionBar
          scope="meal"
          reactions={mealReactions}
          currentUid={currentUid}
          onToggle={onToggleMealReaction}
          pendingEmoji={pendingMealReaction}
          disabled={Boolean(pendingMealReaction)}
        />

        <div className="comments-section">
          <button
            type="button"
            onClick={onToggleComments}
            className="comments-toggle"
            data-testid="meal-card-comment-toggle"
          >
            <span className="comments-toggle-label">
              <MessageSquare size={14} /> 댓글 {commentCount}
            </span>
            <span className="comments-toggle-state">
              {commentsOpen ? "닫기" : "열기"}
              {commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {commentsOpen && (
            <>
              {commentThreads.length > 0 && (
                <div className="comments-list">
                  {commentThreads.map(({ parent, replies }) => (
                    <CommentThread
                      key={parent.id}
                      parent={parent}
                      replies={replies}
                      currentUid={currentUid}
                      editingCommentId={editingCommentId}
                      editingText={editingText}
                      commentActionId={commentActionId}
                      pendingCommentReactionId={pendingCommentReactionId}
                      onReply={onReply}
                      onStartEdit={onStartEdit}
                      onDelete={onDelete}
                      onEditingTextChange={onEditingTextChange}
                      onSave={onSave}
                      onCancelEdit={onCancelEdit}
                      onToggleReaction={onToggleReaction}
                      formatRelativeTime={formatRelativeTime}
                    />
                  ))}
                </div>
              )}

              <CommentComposer
                value={commentText}
                replyTarget={replyTarget}
                disabled={isSubmittingComment || !commentText.trim() || !currentUid}
                onChange={onCommentTextChange}
                onSubmit={onSubmitComment}
                onClearReplyTarget={onClearReplyTarget}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
