"use client";

import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";

import FilterChips from "@/components/FilterChips";
import MealPreviewCard from "@/components/MealPreviewCard";
import PageHeader from "@/components/PageHeader";
import {
  formatArchiveMonth,
  useArchivePageController,
} from "@/lib/modules/meals/ui/useArchivePageController";

export default function ArchivePage() {
  const controller = useArchivePageController();

  if (controller.loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!controller.canRender) return null;

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
              value={controller.query}
              onChange={(event) => controller.onQueryChange(event.target.value)}
              placeholder="음식이나 기록 문구 검색"
              className="search-input"
              data-testid="archive-search-input"
            />
          </div>

          <div className="archive-filter-stack">
            <FilterChips
              value={controller.typeFilter}
              options={controller.typeOptions}
              onChange={controller.setTypeFilter}
              testIdPrefix="archive-filter-type"
            />
            <FilterChips
              value={controller.userFilter}
              options={controller.userOptions}
              onChange={controller.setUserFilter}
              testIdPrefix="archive-filter-user"
            />
            {controller.suggestedUsers.length > 0 && (
              <div className="archive-suggestion-row">
                {controller.suggestedUsers.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className="chip-button"
                    onClick={() => controller.setUserFilter(role)}
                    data-testid={`archive-suggestion-user-${role}`}
                  >
                    {role} 기록 더 보기
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {controller.isPartial && (
          <div className="surface-card empty-state archive-partial-note" data-testid="archive-partial-note">
            <p className="empty-state-copy">
              검색 범위가 넓어 일부 오래된 기록은 다음 페이지에서 이어서 불러옵니다.
            </p>
          </div>
        )}

        {controller.loadingMeals ? (
          <div className="surface-card empty-state">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : controller.sourceMeals.length > 0 ? (
          <div className="page-stack">
            {controller.groupedMeals.map(([monthKey, meals]) => (
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

            {controller.hasMore && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void controller.onLoadMore()}
                data-testid="archive-load-more"
                disabled={controller.loadingMore}
              >
                {controller.loadingMore ? "기록을 더 불러오는 중..." : "기록 더 보기"}
              </button>
            )}
          </div>
        ) : (
          <section className="surface-card empty-state">
            <div className="empty-state-icon">🔎</div>
            <h2 className="empty-state-title">맞는 기록이 없어요</h2>
            <p className="empty-state-copy">
              {controller.hasMore
                ? "검색 범위를 더 불러오면 오래된 기록에서 일치 항목이 나올 수 있습니다."
                : "검색어를 지우거나 필터를 바꾸면 다른 기록을 볼 수 있습니다."}
            </p>
            {controller.hasMore && (
              <button
                type="button"
                className="secondary-button empty-state-cta"
                onClick={() => void controller.onLoadMore()}
                data-testid="archive-load-more"
                disabled={controller.loadingMore}
              >
                {controller.loadingMore ? "기록을 더 불러오는 중..." : "기록 더 보기"}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
