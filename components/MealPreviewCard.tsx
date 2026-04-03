"use client";

import Link from "next/link";
import { Clock, MessageSquare, Sparkles } from "lucide-react";

import { countMealReactions } from "@/lib/client/meals";
import type { Meal } from "@/lib/types";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function MealPreviewCard({ meal }: { meal: Meal }) {
  const date = new Date(meal.timestamp);
  const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const participants = meal.userIds?.length ? meal.userIds : meal.userId ? [meal.userId] : [];
  const reactionCount = countMealReactions(meal);
  const commentCount = meal.commentCount ?? 0;

  return (
    <article className="meal-preview-card surface-card" data-testid={`meal-preview-card-${meal.id}`}>
      {meal.imageUrl ? (
        <div className="meal-preview-image-shell">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meal.imageUrl} alt={meal.description} className="meal-preview-image" />
        </div>
      ) : (
        <div className="meal-preview-image-shell meal-preview-image-fallback">🍽️</div>
      )}

      <div className="meal-preview-body">
        <div className="meal-preview-meta">
          <span className="type-pill">{meal.type}</span>
          <span className="meta-inline text-muted">
            <Clock size={12} /> {timeString}
          </span>
        </div>

        <p className="meal-preview-description">{meal.description}</p>

        <div className="meal-preview-footer">
          <div className="meal-preview-participants">
            {participants.slice(0, 3).map((role) => (
              <span key={role} className="meal-preview-participant">
                {roleEmoji[role] || "🙂"} {role}
              </span>
            ))}
          </div>

          <div className="meal-preview-engagement">
            <span className="meal-preview-engagement-item">
              <Sparkles size={12} /> {reactionCount}
            </span>
            <span className="meal-preview-engagement-item">
              <MessageSquare size={12} /> {commentCount}
            </span>
          </div>
        </div>

        <Link
          href={`/meals/${meal.id}`}
          className="primary-button meal-preview-open"
          data-testid={`meal-preview-open-${meal.id}`}
        >
          기록 보기
        </Link>
      </div>
    </article>
  );
}
