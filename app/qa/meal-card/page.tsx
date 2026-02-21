import MealCard from "@/components/MealCard";
import { getQaDefaultRole } from "@/lib/qa";
import { Meal } from "@/lib/types";
import { notFound } from "next/navigation";

const now = Date.now();
const qaRole = getQaDefaultRole();

const sampleMeal: Meal = {
  id: "qa-meal-card",
  ownerUid: "qa-owner",
  userIds: [qaRole],
  description: "\uD14C\uC2A4\uD2B8\uC6A9 \uC2DD\uC0AC \uCE74\uB4DC\uC785\uB2C8\uB2E4.",
  type: "\uC810\uC2EC" as Meal["type"],
  timestamp: now,
  commentCount: 1,
  comments: [
    {
      id: "qa-comment-1",
      author: qaRole,
      authorUid: "qa-owner",
      text: "\uB313\uAE00 \uC785\uB825\uCC3D \uAC00\uB3C5\uC131 \uD14C\uC2A4\uD2B8",
      createdAt: now - 60_000,
      updatedAt: now - 60_000,
      timestamp: now - 60_000,
    },
  ],
};

export default function QaMealCardPage() {
  const qaEnabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_QA === "true";

  if (!qaEnabled) {
    notFound();
  }

  return (
    <div style={{ padding: "20px 16px", paddingBottom: "100px" }}>
      <h1 style={{ marginBottom: "6px" }}>MealCard QA</h1>
      <p style={{ marginBottom: "16px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
        {"\uB313\uAE00\uC744 \uC5F4\uACE0 \uC785\uB825\uCC3D \uC0C9\uC0C1 / \uAC00\uB3C5\uC131\uC744 \uD655\uC778\uD558\uC138\uC694."}
      </p>
      <MealCard meal={sampleMeal} />
    </div>
  );
}
