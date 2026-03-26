"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Calendar as CalendarIcon, LogOut, Search, X } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import ActivitySummary from "@/components/ActivitySummary";
import FilterChips from "@/components/FilterChips";
import MealCard from "@/components/MealCard";
import LoginView from "@/components/LoginView";
import SurfaceSection from "@/components/SurfaceSection";
import { useUser } from "@/context/UserContext";
import {
  countCommentReactions,
  countMealReactions,
  filterAndSortMeals,
  getMealComments,
  getWeeklyStats,
  searchMeals,
  subscribeMealsForDate,
} from "@/lib/data";
import { createQaMockMeals, isQaMockMode, qaMockWeeklyStats } from "@/lib/qa";
import { Meal, MealComment, UserRole } from "@/lib/types";

const TYPE_OPTIONS = ["전체", "아침", "점심", "저녁", "간식"] as const;
const PARTICIPANT_OPTIONS = ["전체", "아빠", "엄마", "딸", "아들"] as const;
const SORT_OPTIONS = ["recent", "comments", "reactions"] as const;

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function Home() {
  const { user, userProfile, loading, signOut } = useUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<{ label: string; count: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Meal[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [commentsByMeal, setCommentsByMeal] = useState<Record<string, MealComment[]>>({});
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("전체");
  const [participantFilter, setParticipantFilter] = useState<(typeof PARTICIPANT_OPTIONS)[number]>("전체");
  const [sortOrder, setSortOrder] = useState<(typeof SORT_OPTIONS)[number]>("recent");

  useEffect(() => {
    if (!userProfile?.role) return;

    if (isQaMockMode()) {
      setMeals(createQaMockMeals(userProfile.role, selectedDate));
      setLoadingMeals(false);
      return;
    }

    setLoadingMeals(true);
    const unsubscribe = subscribeMealsForDate(
      selectedDate,
      (data) => {
        setMeals(data);
        setLoadingMeals(false);
      },
      (error) => {
        console.error("Failed to load meals", error);
        setLoadingMeals(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, userProfile?.role]);

  useEffect(() => {
    if (!userProfile?.role) return;

    if (isQaMockMode()) {
      setWeeklyStats([...qaMockWeeklyStats]);
      return;
    }

    getWeeklyStats()
      .then((stats) => setWeeklyStats(stats))
      .catch((error) => console.error("Failed to load weekly stats", error));
  }, [userProfile?.role]);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifGranted(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (meals.length === 0) {
      setCommentsByMeal({});
      return;
    }

    if (isQaMockMode()) {
      setCommentsByMeal(
        Object.fromEntries(meals.map((meal) => [meal.id, meal.comments ?? []]))
      );
      return;
    }

    let cancelled = false;
    void Promise.all(
      meals.map(async (meal) => [meal.id, await getMealComments(meal.id)] as const)
    )
      .then((entries) => {
        if (cancelled) return;
        setCommentsByMeal(Object.fromEntries(entries));
      })
      .catch((error) => {
        console.error("Failed to load activity comments", error);
      });

    return () => {
      cancelled = true;
    };
  }, [meals]);

  const handleSearch = async () => {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setSearchResults(null);
      return;
    }

    setSearching(true);

    if (isQaMockMode()) {
      const results = filterAndSortMeals(meals, { query: normalized });
      setSearchResults(results);
      setSearching(false);
      return;
    }

    try {
      const results = await searchMeals(normalized);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  const requestNotification = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === "granted");
    if (perm === "granted") {
      new Notification("가족 식사 기록 🍽️", {
        body: "알림이 활성화되었습니다!",
        icon: "/icons/icon.svg",
      });
    }
  };

  const onDateChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
    setShowCalendar(false);
  };

  const displayedMeals = useMemo(() => {
    const sourceMeals = searchResults ?? meals;
    return filterAndSortMeals(sourceMeals, {
      query: searchResults ? searchQuery : "",
      type: typeFilter,
      participant: participantFilter === "전체" ? "전체" : (participantFilter as UserRole),
      sort: sortOrder,
    });
  }, [meals, participantFilter, searchQuery, searchResults, sortOrder, typeFilter]);

  const activitySummary = useMemo(() => {
    const allComments = Object.values(commentsByMeal).flat();
    const commentMap = new Map(allComments.map((comment) => [comment.id, comment]));

    const commentsCount = allComments.length;
    const reactionsCount =
      meals.reduce((sum, meal) => sum + countMealReactions(meal), 0) + countCommentReactions(allComments);

    const alertCount = allComments.reduce((sum, comment) => {
      const isCommentOnMyMeal =
        comment.authorUid !== userProfile?.uid &&
        meals.some((meal) => meal.id in commentsByMeal && meal.ownerUid === userProfile?.uid && meal.id === Object.entries(commentsByMeal).find(([, comments]) => comments.some((item) => item.id === comment.id))?.[0]);

      const replyToMe =
        typeof comment.parentId === "string" &&
        comment.authorUid !== userProfile?.uid &&
        commentMap.get(comment.parentId)?.authorUid === userProfile?.uid;

      return sum + (isCommentOnMyMeal || replyToMe ? 1 : 0);
    }, 0)
      + meals.reduce((sum, meal) => {
        if (meal.ownerUid !== userProfile?.uid) return sum;
        return (
          sum +
          Object.values(meal.reactions ?? {}).reduce(
            (inner, users) => inner + users.filter((uid) => uid !== userProfile?.uid).length,
            0
          )
        );
      }, 0)
      + allComments.reduce((sum, comment) => {
        if (comment.authorUid !== userProfile?.uid) return sum;
        return (
          sum +
          Object.values(comment.reactions ?? {}).reduce(
            (inner, users) => inner + users.filter((uid) => uid !== userProfile?.uid).length,
            0
          )
        );
      }, 0);

    return {
      items: [
        { key: "meals", label: "식사", value: meals.length },
        { key: "comments", label: "댓글/답글", value: commentsCount },
        { key: "reactions", label: "반응", value: reactionsCount },
      ],
      alertCount,
    };
  }, [commentsByMeal, meals, userProfile?.uid]);

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

  const dateStr = selectedDate.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const isToday = new Date().toDateString() === selectedDate.toDateString();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "좋은 새벽이에요";
    if (h < 12) return "좋은 아침이에요";
    if (h < 18) return "좋은 오후예요";
    return "좋은 저녁이에요";
  };

  const renderMealList = (items: Meal[]) => (
    <div className="meal-list">
      {items.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );

  const resultsTitle = searchResults !== null
    ? "검색 결과"
    : isToday
      ? "오늘의 식사"
      : `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} 식사`;

  return (
    <div className="page-shell">
      <div className="page-stack">
        <header className="section-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "999px",
                display: "grid",
                placeItems: "center",
                fontSize: "1.45rem",
                background: "rgba(255, 255, 255, 0.86)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {roleEmoji[userProfile.role] || "👤"}
            </div>
            <div className="page-stack-gap-sm">
              <p className="page-subtitle" style={{ fontSize: "0.8rem" }}>
                {getGreeting()}
              </p>
              <p className="page-title" style={{ fontSize: "1.15rem" }}>
                {userProfile.role}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            data-testid="home-logout-button"
            className="icon-button surface-card"
            style={{ width: "40px", height: "40px" }}
          >
            <LogOut size={18} />
          </button>
        </header>

        <section className="hero-summary-card">
          <p className="hero-date">{dateStr}</p>
          <p className="hero-count">{loadingMeals ? "..." : `${meals.length}끼 기록됨`}</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setShowCalendar((prev) => !prev)} className="ghost-inverse-button">
              <CalendarIcon size={14} /> 날짜 선택
            </button>
            {!isToday && (
              <button type="button" onClick={() => setSelectedDate(new Date())} className="ghost-inverse-button">
                오늘로
              </button>
            )}
          </div>
        </section>

        {showCalendar && (
          <SurfaceSection bodyClassName="calendar-shell">
            <Calendar onChange={onDateChange} value={selectedDate} locale="ko-KR" />
          </SurfaceSection>
        )}

        <ActivitySummary items={activitySummary.items} alertCount={activitySummary.alertCount} />

        {weeklyStats.length > 0 && (
          <SurfaceSection title="📊 주간 기록" actions={<span className="section-caption">최근 7일</span>}>
            <div className="weekly-chart">
              {weeklyStats.map((day, i) => {
                const maxCount = Math.max(...weeklyStats.map((item) => item.count), 1);
                const heightPct = (day.count / maxCount) * 100;
                const isCurrentDay = i === weeklyStats.length - 1;
                return (
                  <div key={day.label} className="weekly-chart-col">
                    <span className="weekly-chart-value">{day.count}</span>
                    <div
                      className={`weekly-chart-bar${isCurrentDay ? " weekly-chart-bar-active" : ""}`}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                    <span className={`weekly-chart-label${isCurrentDay ? " weekly-chart-label-active" : ""}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </SurfaceSection>
        )}

        {!notifGranted && typeof Notification !== "undefined" && Notification.permission !== "denied" && (
          <button type="button" onClick={requestNotification} className="surface-card search-shell">
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "var(--muted)",
              }}
            >
              <Bell size={18} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: "0.92rem", fontWeight: 700 }}>알림 켜기</p>
              <p className="surface-note">브라우저 알림으로 새 기록을 빠르게 받아보세요.</p>
            </div>
          </button>
        )}

        <SurfaceSection bodyClassName="surface-body form-stack" title="검색과 필터" caption="텍스트 검색과 메타 필터를 조합합니다.">
          <div className="surface-card search-shell" style={{ boxShadow: "none" }}>
            <Search size={18} className="text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
              placeholder="음식, 사람 검색..."
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="icon-button"
                style={{ width: "28px", height: "28px" }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="page-stack-gap-sm">
            <div>
              <p className="form-label">식사 종류</p>
              <FilterChips value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} testIdPrefix="filter-type" />
            </div>
            <div>
              <p className="form-label">참여자</p>
              <FilterChips
                value={participantFilter}
                options={PARTICIPANT_OPTIONS}
                onChange={setParticipantFilter}
                testIdPrefix="filter-user"
              />
            </div>
            <div>
              <p className="form-label">정렬</p>
              <FilterChips value={sortOrder} options={SORT_OPTIONS} onChange={setSortOrder} testIdPrefix="filter-sort" />
            </div>
          </div>
        </SurfaceSection>

        <div className="section-title-row">
          <h2 className="section-heading">{resultsTitle}</h2>
          <span className="section-caption">{displayedMeals.length}개</span>
        </div>

        {searching || loadingMeals ? (
          <div className="loading-shell" style={{ minHeight: "140px" }}>
            <div className="spinner" />
          </div>
        ) : displayedMeals.length === 0 ? (
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🍽️</div>
            <p className="empty-state-title">조건에 맞는 기록이 없어요</p>
            <p className="empty-state-copy">
              {searchResults !== null
                ? `“${searchQuery}” 검색 결과와 필터를 다시 확인해 주세요.`
                : isToday
                  ? "오늘은 아직 조건에 맞는 식사 기록이 없습니다."
                  : "이 날짜에는 조건에 맞는 기록이 없습니다."}
            </p>
            {isToday && searchResults === null && (
              <div style={{ marginTop: "18px" }}>
                <Link href="/add" className="primary-button">
                  식사 추가하기
                </Link>
              </div>
            )}
          </section>
        ) : (
          renderMealList(displayedMeals)
        )}
      </div>
    </div>
  );
}
