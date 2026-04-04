"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import FilterChips from "@/components/FilterChips";
import MealPreviewCard from "@/components/MealPreviewCard";
import PageHeader from "@/components/PageHeader";
import { useUser } from "@/context/UserContext";
import {
  createMealRuntimeState,
  loadArchiveMealsForViewer,
} from "@/lib/features/meals/application/meal-read-service";
import { logError } from "@/lib/logging";
import type { Meal, UserRole } from "@/lib/types";

const TYPE_OPTIONS = ["전체", "아침", "점심", "저녁", "간식"] as const;
const USER_OPTIONS = ["전체", "아빠", "엄마", "딸", "아들"] as const;
const ARCHIVE_PAGE_SIZE = 24;

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
  const [runtimeState] = useState(() => createMealRuntimeState());

  const [sourceMeals, setSourceMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("전체");
  const [userFilter, setUserFilter] = useState<(typeof USER_OPTIONS)[number]>("전체");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
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
      setLoadingMore(false);
      try {
        const response = await loadArchiveMealsForViewer({
          role: currentRole,
          runtimeState,
          query: deferredQuery,
          type: typeFilter,
          participant: userFilter === "전체" ? "전체" : (userFilter as UserRole),
          limit: ARCHIVE_PAGE_SIZE,
        });
        if (!active || requestId !== requestSequenceRef.current) {
          return;
        }
        setSourceMeals(response.meals);
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
        setIsPartial(response.isPartial);
      } catch (error) {
        if (!active || requestId !== requestSequenceRef.current) {
          return;
        }
        logError("Failed to load archive meals", error);
        setSourceMeals([]);
        setNextCursor(null);
        setHasMore(false);
        setIsPartial(false);
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
  }, [deferredQuery, runtimeState, typeFilter, userFilter, userProfile?.role]);

  const groupedMeals = useMemo(() => {
    const groups = new Map<string, Meal[]>();
    sourceMeals.forEach((meal) => {
      const monthKey = getArchiveMonthKey(meal.timestamp);
      const bucket = groups.get(monthKey) ?? [];
      bucket.push(meal);
      groups.set(monthKey, bucket);
    });
    return Array.from(groups.entries());
  }, [sourceMeals]);

  const suggestedUsers = useMemo(() => {
    const counts = new Map<UserRole, number>();

    sourceMeals.forEach((meal) => {
      const participantRoles = meal.userIds?.length ? meal.userIds : meal.userId ? [meal.userId] : [];
      participantRoles.forEach((role) => {
        counts.set(role, (counts.get(role) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .filter(([role]) => role !== userFilter)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .slice(0, 3)
      .map(([role]) => role);
  }, [sourceMeals, userFilter]);

  const loadMoreMeals = async () => {
    if (!hasMore || !nextCursor || loadingMore || runtimeState.qaMode) {
      return;
    }

    const requestId = requestSequenceRef.current;
    setLoadingMore(true);
    try {
      const response = await loadArchiveMealsForViewer({
        role: userProfile?.role,
        runtimeState,
        query: deferredQuery,
        type: typeFilter,
        participant: userFilter === "전체" ? "전체" : (userFilter as UserRole),
        cursor: nextCursor,
        limit: ARCHIVE_PAGE_SIZE,
      });

      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setSourceMeals((prev) => {
        const merged = new Map<string, Meal>();
        prev.forEach((meal) => merged.set(meal.id, meal));
        response.meals.forEach((meal) => merged.set(meal.id, meal));
        return Array.from(merged.values()).sort((left, right) => right.timestamp - left.timestamp);
      });
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
      setIsPartial(response.isPartial);
    } catch (error) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }
      logError("Failed to load more archive meals", error);
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoadingMore(false);
      }
    }
  };

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

        {isPartial && (
          <div className="surface-card empty-state archive-partial-note" data-testid="archive-partial-note">
            <p className="empty-state-copy">
              검색 범위가 넓어 일부 오래된 기록은 다음 페이지에서 이어서 불러옵니다.
            </p>
          </div>
        )}

        {loadingMeals ? (
          <div className="surface-card empty-state">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : sourceMeals.length > 0 ? (
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

            {hasMore && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void loadMoreMeals()}
                data-testid="archive-load-more"
                disabled={loadingMore}
              >
                {loadingMore ? "기록을 더 불러오는 중..." : "기록 더 보기"}
              </button>
            )}
          </div>
        ) : (
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🔎</div>
            <h2 className="empty-state-title">맞는 기록이 없어요</h2>
            <p className="empty-state-copy">
              {hasMore
                ? "검색 범위를 더 불러오면 오래된 기록에서 일치 항목이 나올 수 있습니다."
                : "검색어를 지우거나 필터를 바꾸면 다른 기록을 볼 수 있습니다."}
            </p>
            {hasMore && (
              <button
                type="button"
                className="secondary-button empty-state-cta"
                onClick={() => void loadMoreMeals()}
                data-testid="archive-load-more"
                disabled={loadingMore}
              >
                {loadingMore ? "기록을 더 불러오는 중..." : "기록 더 보기"}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
