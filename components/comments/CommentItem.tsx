"use client";

import { Check, Pencil, Reply, Trash2, X } from "lucide-react";

import ReactionBar from "@/components/ReactionBar";
import type { MealComment, ReactionEmoji } from "@/lib/types";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function CommentItem({
  comment,
  currentUid,
  isReply = false,
  isEditing,
  editingText,
  actionPending,
  reactionPending,
  onReply,
  onStartEdit,
  onDelete,
  onEditingTextChange,
  onSave,
  onCancelEdit,
  onToggleReaction,
  formatRelativeTime,
}: {
  comment: MealComment;
  currentUid?: string;
  isReply?: boolean;
  isEditing: boolean;
  editingText: string;
  actionPending: boolean;
  reactionPending: boolean;
  onReply?: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onEditingTextChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onToggleReaction: (emoji: ReactionEmoji) => void;
  formatRelativeTime: (timestamp: number) => string;
}) {
  const timeBase = comment.updatedAt ?? comment.createdAt ?? comment.timestamp ?? 0;
  const canManage = Boolean(currentUid && comment.authorUid === currentUid);

  return (
    <div className={`comment-item${isReply ? " comment-item-reply" : ""}`}>
      <div className="comment-header">
        <div className="comment-meta">
          <span className="comment-author">
            {roleEmoji[comment.author] || "🙂"} {comment.author}
          </span>
          <span className="comment-time">{formatRelativeTime(timeBase)}</span>
        </div>

        <div className="comment-actions">
          {!isReply && onReply && (
            <button
              type="button"
              onClick={onReply}
              className="comment-action-btn"
              data-testid={`comment-reply-button-${comment.id}`}
            >
              <Reply size={12} />
            </button>
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                disabled={actionPending}
                className="comment-action-btn"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={actionPending}
                className="comment-action-btn"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="comment-edit-row">
          <input
            type="text"
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!actionPending) {
                  onSave();
                }
              }
            }}
            className="input-base input-pill comment-input"
            style={{
              flex: 1,
              padding: "6px 10px",
              fontSize: "0.8rem",
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={onSave}
            disabled={actionPending || !editingText.trim()}
            className="comment-save-btn"
          >
            <Check size={12} />
          </button>

          <button
            type="button"
            onClick={onCancelEdit}
            disabled={actionPending}
            className="comment-cancel-btn"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <>
          {comment.mentionedAuthor && (
            <p className="comment-mention">
              {comment.mentionedAuthor}님께 답글
            </p>
          )}
          <p className="comment-text">{comment.text}</p>
          <ReactionBar
            scope="comment"
            reactions={comment.reactions}
            currentUid={currentUid}
            onToggle={onToggleReaction}
            disabled={reactionPending}
            compact
          />
        </>
      )}
    </div>
  );
}
