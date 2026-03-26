"use client";

import { Send, X } from "lucide-react";

import type { UserRole } from "@/lib/types";

export type ReplyTarget = {
  id: string;
  author: UserRole;
};

export default function CommentComposer({
  value,
  replyTarget,
  disabled,
  onChange,
  onSubmit,
  onClearReplyTarget,
}: {
  value: string;
  replyTarget: ReplyTarget | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClearReplyTarget: () => void;
}) {
  return (
    <>
      {replyTarget && (
        <div className="reply-target surface-card" data-testid="comment-reply-target">
          <span>{replyTarget.author}님께 답글</span>
          <button type="button" className="icon-button" onClick={onClearReplyTarget}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="comment-input-row">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!disabled) {
                onSubmit();
              }
            }
          }}
          placeholder={replyTarget ? `${replyTarget.author}님께 답글을 남겨보세요` : "댓글을 입력하세요"}
          className="input-base input-pill comment-input"
          data-testid="meal-card-comment-input"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: "0.84rem",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="comment-send-btn"
        >
          <Send size={14} />
        </button>
      </div>
    </>
  );
}
