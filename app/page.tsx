"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, Images, LogOut, Plus } from "lucide-react";

import SurfaceSection from "@/components/SurfaceSection";
import WeekDateStrip from "@/components/WeekDateStrip";
import MealPreviewCard from "@/lib/modules/meals/ui/components/MealPreviewCard";
import { useHomePageController } from "@/lib/modules/meals/ui/useHomePageController";
import LoginView from "@/lib/modules/profile/ui/LoginView";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

const LazyCalendar = dynamic(() => import("@/components/LazyCalendar"));

function HomeContent() {
  const controller = useHomePageController();

  if (controller.loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (controller.showLogin || !controller.role) {
    return <LoginView />;
  }

  return (
    <div className="page-shell home-page-shell">
      <div className="page-stack">
        <header className="section-title-row">
          <div className="home-user-header">
            <div className="home-user-avatar">{roleEmoji[controller.role] || "👤"}</div>
            <div className="page-stack-gap-sm">
              <p className="page-subtitle">{controller.greeting}</p>
              <p className="page-title home-page-title">{controller.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void controller.signOut()}
            data-testid="home-logout-button"
            className="icon-button surface-card"
            style={{ width: "42px", height: "42px" }}
            aria-label="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </header>

        <section className="home-journal-card">
          <div className="home-journal-copy">
            <p className="home-journal-kicker">이번 주 식사 저널</p>
            <h1 className="home-journal-title">{controller.selectedDateLabel}</h1>
            <p className="home-journal-summary">
              {controller.loadingMeals
                ? "기록을 불러오는 중입니다."
                : controller.hasMeals
                  ? `${controller.meals.length}개의 식사 사진이 남아 있어요.`
                  : "아직 남긴 식사 사진이 없어요."}
            </p>
          </div>

          <div className="home-journal-actions">
            <button
              type="button"
              onClick={controller.toggleCalendar}
              className="ghost-inverse-button"
              data-testid="home-calendar-toggle"
            >
              <CalendarIcon size={15} /> 날짜 선택
            </button>
            {!controller.isToday && (
              <button
                type="button"
                onClick={controller.selectToday}
                className="ghost-inverse-button"
              >
                오늘로
              </button>
            )}
          </div>

          <div className="home-weekly-totals">
            <div className="home-weekly-chip">
              <span className="home-weekly-chip-label">이번 주</span>
              <strong>{controller.weeklyTotal}끼</strong>
            </div>
            <div className="home-weekly-chip">
              <span className="home-weekly-chip-label">선택한 날</span>
              <strong>{controller.loadingMeals ? "..." : `${controller.meals.length}개`}</strong>
            </div>
          </div>

          <WeekDateStrip
            selectedDate={controller.effectiveSelectedDate}
            stats={controller.weeklyStats}
            onSelectDate={controller.onSelectDate}
          />
        </section>

        {controller.showCalendar && (
          <SurfaceSection bodyClassName="calendar-shell">
            <LazyCalendar
              onChange={controller.onCalendarDateChange}
              value={controller.effectiveSelectedDate}
              locale="ko-KR"
            />
          </SurfaceSection>
        )}

        <section className="section-title-row">
          <div className="page-stack-gap-sm">
            <h2 className="section-heading">
              {controller.isToday ? "오늘의 식사 사진" : "선택한 날의 식사 사진"}
            </h2>
            <p className="section-caption">사진을 누르면 기록 전체를 자세히 볼 수 있습니다.</p>
          </div>
          <div className="home-section-actions">
            <Link href="/archive" className="link-button home-journal-link" data-testid="home-archive-link">
              <Images size={16} /> 모아보기
            </Link>
            <Link href={controller.addMealHref} className="link-button home-journal-link">
              <Plus size={16} /> 새 기록
            </Link>
          </div>
        </section>

        {controller.loadingMeals ? (
          <div className="surface-card empty-state">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : controller.hasMeals ? (
          <div className="meal-list">
            {controller.meals.map((meal) => (
              <MealPreviewCard key={meal.id} meal={meal} />
            ))}
          </div>
        ) : (
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🍽️</div>
            <h2 className="empty-state-title">아직 사진 기록이 없어요</h2>
            <p className="empty-state-copy">
              오늘 먹은 식사를 사진으로 남기면 날짜별로 다시 보기 쉬워집니다.
            </p>
            <Link href={controller.addMealHref} className="primary-button empty-state-cta">
              <Plus size={18} /> 첫 기록 남기기
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="loading-shell">
          <div className="spinner" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
