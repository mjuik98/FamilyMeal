"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, Images, LogOut, Plus } from "lucide-react";

import LoginView from "@/components/LoginView";
import MealPreviewCard from "@/components/MealPreviewCard";
import SurfaceSection from "@/components/SurfaceSection";
import WeekDateStrip from "@/components/WeekDateStrip";
import { useMealsForDate } from "@/components/hooks/useMealsForDate";
import { useSelectedDate } from "@/components/hooks/useSelectedDate";
import { useWeeklyStats } from "@/components/hooks/useWeeklyStats";
import { useUser } from "@/context/UserContext";
import { formatDateKey } from "@/lib/date-utils";
import { isQaMockMode } from "@/lib/qa/mode";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getQaAnchorDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (6 - date.getDay()));
  return date;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

const LazyCalendar = dynamic(() => import("@/components/LazyCalendar"));

function HomeContent() {
  const { user, userProfile, loading, signOut } = useUser();
  const qaMode = isQaMockMode();
  const [qaAnchorDate] = useState(getQaAnchorDate);
  const { effectiveSelectedDate, showCalendar, setShowCalendar, selectDate, onDateChange } =
    useSelectedDate({
      qaMode,
      qaAnchorDate,
    });
  const { meals, loadingMeals } = useMealsForDate({
    effectiveSelectedDate,
    qaMode,
    qaAnchorDate,
    role: userProfile?.role,
  });
  const weeklyStats = useWeeklyStats({
    effectiveSelectedDate,
    qaMode,
    qaAnchorDate,
    role: userProfile?.role,
  });

  const selectedDateLabel = useMemo(() => formatLongDate(effectiveSelectedDate), [effectiveSelectedDate]);
  const weeklyTotal = useMemo(
    () => weeklyStats.reduce((sum, day) => sum + day.count, 0),
    [weeklyStats]
  );
  const hasMeals = meals.length > 0;
  const isToday = isSameDay(effectiveSelectedDate, new Date());

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "조용한 새벽 기록";
    if (h < 12) return "아침 식사 기록";
    if (h < 18) return "오늘의 식사 기록";
    return "저녁 식사 기록";
  }, []);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!user || !userProfile?.role) {
    return <LoginView />;
  }

  return (
    <div className="page-shell home-page-shell">
      <div className="page-stack">
        <header className="section-title-row">
          <div className="home-user-header">
            <div className="home-user-avatar">{roleEmoji[userProfile.role] || "👤"}</div>
            <div className="page-stack-gap-sm">
              <p className="page-subtitle">{greeting}</p>
              <p className="page-title home-page-title">{userProfile.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            data-testid="home-logout-button"
            className="icon-button surface-card"
            style={{ width: "42px", height: "42px" }}
          >
            <LogOut size={18} />
          </button>
        </header>

        <section className="home-journal-card">
          <div className="home-journal-copy">
            <p className="home-journal-kicker">이번 주 식사 저널</p>
            <h1 className="home-journal-title">{selectedDateLabel}</h1>
            <p className="home-journal-summary">
              {loadingMeals
                ? "기록을 불러오는 중입니다."
                : hasMeals
                  ? `${meals.length}개의 식사 사진이 남아 있어요.`
                  : "아직 남긴 식사 사진이 없어요."}
            </p>
          </div>

          <div className="home-journal-actions">
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className="ghost-inverse-button"
              data-testid="home-calendar-toggle"
            >
              <CalendarIcon size={15} /> 날짜 선택
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                className="ghost-inverse-button"
              >
                오늘로
              </button>
            )}
          </div>

          <div className="home-weekly-totals">
            <div className="home-weekly-chip">
              <span className="home-weekly-chip-label">이번 주</span>
              <strong>{weeklyTotal}끼</strong>
            </div>
            <div className="home-weekly-chip">
              <span className="home-weekly-chip-label">선택한 날</span>
              <strong>{loadingMeals ? "..." : `${meals.length}개`}</strong>
            </div>
          </div>

          <WeekDateStrip
            selectedDate={effectiveSelectedDate}
            stats={weeklyStats}
            onSelectDate={(date) => {
              selectDate(date);
              setShowCalendar(false);
            }}
          />
        </section>

        {showCalendar && (
          <SurfaceSection bodyClassName="calendar-shell">
            <LazyCalendar onChange={onDateChange} value={effectiveSelectedDate} locale="ko-KR" />
          </SurfaceSection>
        )}

        <section className="section-title-row">
          <div className="page-stack-gap-sm">
            <h2 className="section-heading">{isToday ? "오늘의 식사 사진" : "선택한 날의 식사 사진"}</h2>
            <p className="section-caption">사진을 누르면 기록 전체를 자세히 볼 수 있습니다.</p>
          </div>
          <div className="home-section-actions">
            <Link href="/archive" className="link-button home-journal-link" data-testid="home-archive-link">
              <Images size={16} /> 모아보기
            </Link>
            <Link href={`/add?date=${formatDateKey(effectiveSelectedDate)}`} className="link-button home-journal-link">
              <Plus size={16} /> 새 기록
            </Link>
          </div>
        </section>

        {loadingMeals ? (
          <div className="surface-card empty-state">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : hasMeals ? (
          <div className="meal-list">
            {meals.map((meal) => (
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
            <Link href={`/add?date=${formatDateKey(effectiveSelectedDate)}`} className="primary-button empty-state-cta">
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
