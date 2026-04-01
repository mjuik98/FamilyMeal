"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import FilterChips from "@/components/FilterChips";
import MealPreviewCard from "@/components/MealPreviewCard";
import PageHeader from "@/components/PageHeader";
import { useUser } from "@/context/UserContext";
import { filterAndSortMeals, getRecentMeals, searchMeals } from "@/lib/client/meals";
import { createQaMockRecentMeals, isQaMockMode } from "@/lib/qa";
import type { Meal, UserRole } from "@/lib/types";

const TYPE_OPTIONS = ["전체", "아침", "점심", "저녁", "간식"] as const;
const USER_OPTIONS = ["전체", "아빠", "엄마", "딸", "아들"] as const;
const ARCHIVE_INITIAL_VISIBLE = 8;
const ARCHIVE_PAGE_SIZE = 4;

const getArchiveMonthKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
};

const formatArchiveMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
};

export default function ArchivePage() {
  const { userProfile, loading } = useUser();
  const router = useRouter();

  const [sourceMeals, setSourceMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("전체");
  const [userFilter, setUserFilter] = useState<(typeof USER_OPTIONS)[number]>("전체");
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_INITIAL_VISIBLE);
  const deferredQuery = useDeferredValue(query.trim());
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (!loading && !userProfile?.role) {
      router.replace("/");
    }
  }, [loading, router, userProfile?.role]);

  useEffect(() => {
    if (!userProfile?.role) return;

    const currentRole = userProfile.role;
    let active = true;
    const requestId = ++requestSequenceRef.current;

    const loadMeals = async () => {
      setLoadingMeals(true);
      try {
        if (isQaMockMode()) {
          if (!active || requestId !== requestSequenceRef.current) {
            return;
          }
          setSourceMeals(createQaMockRecentMeals(currentRole));
          return;
        }

        const nextMeals = deferredQuery ? await searchMeals(deferredQuery) : await getRecentMeals();
        if (!active || requestId !== requestSequenceRef.current) {
          return;
        }
        setSourceMeals(nextMeals);
      } catch (error) {
        if (!active || requestId !== requestSequenceRef.current) {
          return;
        }
        console.error("Failed to load archive meals", error);
        setSourceMeals([]);
      } finally {
        if (active && requestId === requestSequenceRef.current) {
          setLoadingMeals(false);
        }
      }
    };

    void loadMeals();

    return () => {
      active = false;
    };
  }, [deferredQuery, userProfile?.role]);

  useEffect(() => {
    setVisibleCount(ARCHIVE_INITIAL_VISIBLE);
  }, [query, typeFilter, userFilter]);

  const displayedMeals = useMemo(
    () =>
      filterAndSortMeals(sourceMeals, {
        query,
        type: typeFilter,
        participant: userFilter === "전체" ? "전체" : (userFilter as UserRole),
        sort: "recent",
      }),
    [query, sourceMeals, typeFilter, userFilter]
  );

  const visibleMeals = useMemo(
    () => displayedMeals.slice(0, visibleCount),
    [displayedMeals, visibleCount]
  );

  const groupedMeals = useMemo(() => {
    const groups = new Map<string, Meal[]>();
    visibleMeals.forEach((meal) => {
      const monthKey = getArchiveMonthKey(meal.timestamp);
      const bucket = groups.get(monthKey) ?? [];
      bucket.push(meal);
      groups.set(monthKey, bucket);
    });
    return Array.from(groups.entries());
  }, [visibleMeals]);

  const suggestedUsers = useMemo(() => {
    const counts = new Map<UserRole, number>();

    displayedMeals.forEach((meal) => {
      meal.userIds?.forEach((role) => {
        counts.set(role, (counts.get(role) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .filter(([role]) => role !== userFilter)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .slice(0, 3)
      .map(([role]) => role);
  }, [displayedMeals, userFilter]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!userProfile?.role) return null;

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader
          title="기록 모아보기"
          subtitle="홈에서 빠진 검색과 필터는 이곳에서 사용합니다."
          actions={
            <Link href="/" className="link-button">
              <ChevronLeft size={16} /> 홈
            </Link>
          }
        />

        <section className="surface-card archive-controls">
          <div className="search-shell">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="음식이나 기록 문구 검색"
              className="search-input"
              data-testid="archive-search-input"
            />
          </div>

          <div className="archive-filter-stack">
            <FilterChips
              value={typeFilter}
              options={TYPE_OPTIONS}
              onChange={setTypeFilter}
              testIdPrefix="archive-filter-type"
            />
            <FilterChips
              value={userFilter}
              options={USER_OPTIONS}
              onChange={setUserFilter}
              testIdPrefix="archive-filter-user"
            />
            {suggestedUsers.length > 0 && (
              <div className="archive-suggestion-row">
                {suggestedUsers.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className="chip-button"
                    onClick={() => setUserFilter(role)}
                    data-testid={`archive-suggestion-user-${role}`}
                  >
                    {role} 기록 더 보기
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {loadingMeals ? (
          <div className="surface-card empty-state">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : displayedMeals.length > 0 ? (
          <div className="page-stack">
            {groupedMeals.map(([monthKey, meals]) => (
              <section
                key={monthKey}
                className="archive-group"
                data-testid={`archive-group-${monthKey}`}
              >
                <div className="archive-group-header">
                  <h2 className="section-heading">{formatArchiveMonth(monthKey)}</h2>
                  <span className="section-caption">{meals.length}개 기록</span>
                </div>
                <div className="meal-list">
                  {meals.map((meal) => (
                    <MealPreviewCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </section>
            ))}

            {displayedMeals.length > visibleCount && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setVisibleCount((prev) => prev + ARCHIVE_PAGE_SIZE)}
                data-testid="archive-load-more"
              >
                기록 더 보기
              </button>
            )}
          </div>
        ) : (
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🔎</div>
            <h2 className="empty-state-title">맞는 기록이 없어요</h2>
            <p className="empty-state-copy">검색어를 지우거나 필터를 바꾸면 다른 기록을 볼 수 있습니다.</p>
          </section>
        )}
      </div>
    </div>
  );
}
