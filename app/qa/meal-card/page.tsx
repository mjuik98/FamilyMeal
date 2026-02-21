import MealCard from "@/components/MealCard";
import { Meal } from "@/lib/types";
import { notFound } from "next/navigation";

const now = Date.now();

const sampleMeal: Meal = {
  id: "qa-meal-card",
  ownerUid: "qa-owner",
  userIds: ["아빠"],
  description: "테스트용 식사 카드입니다.",
  type: "점심",
  timestamp: now,
  commentCount: 1,
  comments: [
    {
      id: "qa-comment-1",
      author: "아빠",
      authorUid: "qa-owner",
      text: "댓글 입력창 가시성 테스트",
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
        댓글 토글을 열고 입력창 색상/가독성을 확인하세요.
      </p>
      <MealCard meal={sampleMeal} />
    </div>
  );
}
