"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Images } from "lucide-react";

import MealCard from "@/components/MealCard";
import PageHeader from "@/components/PageHeader";
import { useMealDetailPageController } from "@/lib/modules/meals/ui/useMealDetailPageController";

export default function MealDetailPage() {
  const params = useParams();
  const mealId = params.id as string;
  const controller = useMealDetailPageController(mealId);

  if (controller.loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!controller.canRender) return null;

  if (controller.loadingMeal) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!controller.meal) {
    return (
      <div className="page-shell">
        <div className="page-stack">
          <PageHeader title="기록을 찾지 못했어요" subtitle="삭제되었거나 접근할 수 없는 식사 기록입니다." />
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🗂️</div>
            <h2 className="empty-state-title">다른 기록을 열어보세요</h2>
            <p className="empty-state-copy">홈이나 아카이브에서 다시 선택할 수 있습니다.</p>
            <div className="home-section-actions" style={{ justifyContent: "center" }}>
              <Link href="/" className="secondary-button">
                <ChevronLeft size={16} /> 홈으로
              </Link>
              <Link href="/archive" className="primary-button">
                <Images size={16} /> 아카이브
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" data-testid="meal-detail-screen">
      <div className="page-stack">
        <PageHeader
          title="식사 기록 상세"
          subtitle="사진을 크게 보고, 같은 날 기록까지 이어서 살펴보세요."
          actions={
            <div className="home-section-actions">
              <button type="button" onClick={controller.goBack} className="link-button">
                <ChevronLeft size={16} /> 뒤로
              </button>
              <Link href="/archive" className="link-button">
                <Images size={16} /> 아카이브
              </Link>
            </div>
          }
        />

        <MealCard
          key={controller.meal.id}
          meal={controller.meal}
          sameDayMeals={controller.sameDayMeals}
          onDeleted={controller.handleDeleted}
          onSelectMeal={controller.handleSelectMeal}
        />
      </div>
    </div>
  );
}
