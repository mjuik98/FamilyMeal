"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Images } from "lucide-react";

import MealCard from "@/components/MealCard";
import PageHeader from "@/components/PageHeader";
import { useUser } from "@/context/UserContext";
import { getMealById, getMealsForDate } from "@/lib/client/meals";
import { createQaMockRecentMeals, getQaMockMealById, isQaMockMode } from "@/lib/qa";
import type { Meal } from "@/lib/types";

export default function MealDetailPage() {
  const { user, userProfile, loading } = useUser();
  const params = useParams();
  const router = useRouter();
  const mealId = params.id as string;

  const [meal, setMeal] = useState<Meal | null>(null);
  const [sameDayMeals, setSameDayMeals] = useState<Meal[]>([]);
  const [loadingMeal, setLoadingMeal] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile?.role) {
      router.replace("/");
    }
  }, [loading, router, userProfile?.role]);

  useEffect(() => {
    if (!userProfile?.role) return;

    const currentRole = userProfile.role;
    setLoadingMeal(true);
    setSameDayMeals([]);

    const loadMeal = async () => {
      try {
        if (isQaMockMode()) {
          setMeal(getQaMockMealById(currentRole, mealId));
          return;
        }

        const nextMeal = await getMealById(mealId);
        setMeal(nextMeal);
      } catch (error) {
        console.error("Failed to load meal detail", error);
        setMeal(null);
      } finally {
        setLoadingMeal(false);
      }
    };

    void loadMeal();
  }, [mealId, userProfile?.role]);

  useEffect(() => {
    if (!meal || !userProfile?.role) return;

    const currentRole = userProfile.role;
    const mealDate = new Date(meal.timestamp);

    const loadSameDayMeals = async () => {
      try {
        if (isQaMockMode()) {
          setSameDayMeals(
            createQaMockRecentMeals(currentRole, mealDate, mealDate).filter((item) => {
              const itemDate = new Date(item.timestamp);
              return (
                itemDate.getFullYear() === mealDate.getFullYear() &&
                itemDate.getMonth() === mealDate.getMonth() &&
                itemDate.getDate() === mealDate.getDate()
              );
            })
          );
          return;
        }

        const nextMeals = await getMealsForDate(mealDate);
        setSameDayMeals(nextMeals);
      } catch (error) {
        console.error("Failed to load same-day meals", error);
        setSameDayMeals([meal]);
      }
    };

    void loadSameDayMeals();
  }, [meal, userProfile?.role]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  if (!userProfile?.role) return null;

  if (loadingMeal) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!meal) {
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
              <button type="button" onClick={() => router.back()} className="link-button">
                <ChevronLeft size={16} /> 뒤로
              </button>
              <Link href="/archive" className="link-button">
                <Images size={16} /> 아카이브
              </Link>
            </div>
          }
        />

        <MealCard
          key={meal.id}
          meal={meal}
          sameDayMeals={sameDayMeals}
          onSelectMeal={(nextMealId) => {
            if (nextMealId === meal.id) return;
            router.replace(`/meals/${nextMealId}`);
          }}
        />
      </div>
    </div>
  );
}
