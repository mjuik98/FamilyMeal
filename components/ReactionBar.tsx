"use client";

import { ReactionEmoji, ReactionMap } from "@/lib/types";
import { REACTION_OPTIONS, getReactionCount, hasUserReacted } from "@/lib/reactions";

type ReactionScope = "meal" | "comment";

export default function ReactionBar({
  scope,
  reactions,
  currentUid,
  onToggle,
  pendingEmoji,
  disabled = false,
  compact = false,
}: {
  scope: ReactionScope;
  reactions?: ReactionMap;
  currentUid?: string | null;
  onToggle: (emoji: ReactionEmoji) => void | Promise<void>;
  pendingEmoji?: ReactionEmoji | null;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`reaction-bar${compact ? " reaction-bar-compact" : ""}`}>
      {REACTION_OPTIONS.map((option) => {
        const count = getReactionCount(reactions ?? {}, option.emoji);
        const active = hasUserReacted(reactions ?? {}, option.emoji, currentUid);
        const isPending = disabled || pendingEmoji === option.emoji;

        return (
          <button
            key={option.emoji}
            type="button"
            onClick={() => void onToggle(option.emoji)}
            disabled={isPending}
            className={`reaction-chip${active ? " reaction-chip-active" : ""}${compact ? " reaction-chip-compact" : ""}`}
            aria-label={`${option.label} 반응`}
            aria-pressed={active}
            data-active={active ? "true" : "false"}
            data-testid={`${scope}-reaction-chip-${option.key}`}
          >
            <span className="reaction-chip-emoji">{option.emoji}</span>
            <span className="reaction-chip-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
