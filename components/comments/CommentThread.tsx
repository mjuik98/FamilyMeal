"use client";

import type { MealComment, ReactionEmoji, UserRole } from "@/lib/types";

import CommentItem from "./CommentItem";

export default function CommentThread({
  parent,
  replies,
  currentUid,
  editingCommentId,
  editingText,
  commentActionId,
  pendingCommentReactionId,
  onReply,
  onStartEdit,
  onDelete,
  onEditingTextChange,
  onSave,
  onCancelEdit,
  onToggleReaction,
}: {
  parent: MealComment;
  replies: MealComment[];
  currentUid?: string;
  editingCommentId: string | null;
  editingText: string;
  commentActionId: string | null;
  pendingCommentReactionId: string | null;
  onReply: (target: { id: string; author: UserRole }) => void;
  onStartEdit: (commentId: string, currentText: string) => void;
  onDelete: (commentId: string) => void;
  onEditingTextChange: (value: string) => void;
  onSave: (commentId: string) => void;
  onCancelEdit: () => void;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void;
}) {
  return (
    <div className="comment-thread">
      <CommentItem
        comment={parent}
        currentUid={currentUid}
        isEditing={editingCommentId === parent.id}
        editingText={editingCommentId === parent.id ? editingText : parent.text}
        actionPending={commentActionId === parent.id}
        reactionPending={pendingCommentReactionId === parent.id}
        onReply={() => onReply({ id: parent.id, author: parent.author })}
        onStartEdit={() => onStartEdit(parent.id, parent.text)}
        onDelete={() => onDelete(parent.id)}
        onEditingTextChange={onEditingTextChange}
        onSave={() => onSave(parent.id)}
        onCancelEdit={onCancelEdit}
        onToggleReaction={(emoji) => onToggleReaction(parent.id, emoji)}
      />

      {replies.map((reply) => (
        <div key={reply.id} className="comment-thread-reply">
          <CommentItem
            comment={reply}
            currentUid={currentUid}
            isReply
            isEditing={editingCommentId === reply.id}
            editingText={editingCommentId === reply.id ? editingText : reply.text}
            actionPending={commentActionId === reply.id}
            reactionPending={pendingCommentReactionId === reply.id}
            onStartEdit={() => onStartEdit(reply.id, reply.text)}
            onDelete={() => onDelete(reply.id)}
            onEditingTextChange={onEditingTextChange}
            onSave={() => onSave(reply.id)}
            onCancelEdit={onCancelEdit}
            onToggleReaction={(emoji) => onToggleReaction(reply.id, emoji)}
          />
        </div>
      ))}
    </div>
  );
}
