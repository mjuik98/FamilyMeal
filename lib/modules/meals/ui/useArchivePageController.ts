"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/context/UserContext";
import { logError } from "@/lib/logging";
import {
  createMealRuntimeState,
  loadArchiveMealsForViewer,
} from "@/lib/modules/meals/application/meal-read-service";
import type { Meal, UserRole } from "@/lib/types";

const TYPE_OPTIONS = ["전체", "아침", "점심", "저녁", "간식"] as const;
const USER_OPTIONS = ["전체", "아빠", "엄마", "딸", "아들"] as const;
const ARCHIVE_PAGE_SIZE = 24;

const getArchiveMonthKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
};

export const formatArchiveMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
};

export const useArchivePageController = () => {
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
    if (!userProfile?.role || !hasMore || !nextCursor || loadingMore || runtimeState.qaMode) {
      return;
    }

    const requestId = requestSequenceRef.current;
    setLoadingMore(true);
    try {
      const response = await loadArchiveMealsForViewer({
        role: userProfile.role,
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

  return {
    canRender: Boolean(userProfile?.role),
    groupedMeals,
    hasMore,
    isPartial,
    loading,
    loadingMeals,
    loadingMore,
    onLoadMore: loadMoreMeals,
    onQueryChange: setQuery,
    query,
    setTypeFilter,
    setUserFilter,
    sourceMeals,
    suggestedUsers,
    typeFilter,
    typeOptions: TYPE_OPTIONS,
    userFilter,
    userOptions: USER_OPTIONS,
  };
};
