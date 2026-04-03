"use client";

import { Clock, Pencil, Trash2 } from "lucide-react";

import type { Meal } from "@/lib/types";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function MealDetailSummary({
  meal,
  isOwner,
  deleteDisabled = false,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  isOwner: boolean;
  deleteDisabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const date = new Date(meal.timestamp);
  const timeString = date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const participants = meal.userIds?.length ? meal.userIds : meal.userId ? [meal.userId] : [];

  return (
    <section className="meal-detail-summary surface-card" data-testid="meal-detail-summary">
      <div className="meal-detail-summary-header">
        <div className="meal-card-meta">
          <span className="type-pill">{meal.type}</span>
          <span className="meta-inline text-muted">
            <Clock size={12} /> {timeString}
          </span>
          <span className="meta-inline text-muted">{dateLabel}</span>
        </div>

        {isOwner && (
          <div className="meal-card-actions">
            <button type="button" onClick={onEdit} title="수정" className="icon-button">
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="삭제"
              className="icon-button"
              disabled={deleteDisabled}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <p className="meal-card-description">{meal.description}</p>

      <div className="participant-list">
        {participants.map((role, index) => (
          <span
            key={`${role}-${index}`}
            className={`participant-chip${index === 0 ? " participant-chip-primary" : ""}`}
          >
            {roleEmoji[role] || "🙂"} {role}
          </span>
        ))}
      </div>
    </section>
  );
}
