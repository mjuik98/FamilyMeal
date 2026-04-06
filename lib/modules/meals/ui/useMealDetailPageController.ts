"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/context/UserContext";
import { logError } from "@/lib/logging";
import type { MealDeleteResult } from "@/lib/modules/meals/application/meal-editor-service";
import {
  createMealRuntimeState,
  loadMealForViewer,
  loadSameDayMealsForViewer,
} from "@/lib/modules/meals/application/meal-read-service";
import type { Meal } from "@/lib/types";

export const useMealDetailPageController = (mealId: string) => {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();
  const [runtimeState] = useState(() => createMealRuntimeState());
  const [meal, setMeal] = useState<Meal | null>(null);
  const [sameDayMeals, setSameDayMeals] = useState<Meal[]>([]);
  const [loadingMeal, setLoadingMeal] = useState(true);
  const mealRequestSequenceRef = useRef(0);
  const sameDayRequestSequenceRef = useRef(0);

  useEffect(() => {
    if (!loading && !userProfile?.role) {
      router.replace("/");
    }
  }, [loading, router, userProfile?.role]);

  useEffect(() => {
    if (!userProfile?.role) return;

    const currentRole = userProfile.role;
    let active = true;
    const requestId = ++mealRequestSequenceRef.current;
    setLoadingMeal(true);
    setSameDayMeals([]);

    const loadCurrentMeal = async () => {
      try {
        const nextMeal = await loadMealForViewer({
          role: currentRole,
          mealId,
          runtimeState,
        });
        if (!active || requestId !== mealRequestSequenceRef.current) {
          return;
        }
        setMeal(nextMeal);
      } catch (error) {
        if (!active || requestId !== mealRequestSequenceRef.current) {
          return;
        }
        logError("Failed to load meal detail", error);
        setMeal(null);
      } finally {
        if (active && requestId === mealRequestSequenceRef.current) {
          setLoadingMeal(false);
        }
      }
    };

    void loadCurrentMeal();

    return () => {
      active = false;
    };
  }, [mealId, runtimeState, userProfile?.role]);

  useEffect(() => {
    if (!meal || !userProfile?.role) return;

    const currentRole = userProfile.role;
    const mealDate = new Date(meal.timestamp);
    let active = true;
    const requestId = ++sameDayRequestSequenceRef.current;

    const loadRelatedMeals = async () => {
      try {
        const nextMeals = await loadSameDayMealsForViewer({
          role: currentRole,
          mealDate,
          runtimeState,
        });
        if (!active || requestId !== sameDayRequestSequenceRef.current) {
          return;
        }
        setSameDayMeals(nextMeals);
      } catch (error) {
        if (!active || requestId !== sameDayRequestSequenceRef.current) {
          return;
        }
        logError("Failed to load same-day meals", error);
        setSameDayMeals([meal]);
      }
    };

    void loadRelatedMeals();

    return () => {
      active = false;
    };
  }, [meal, runtimeState, userProfile?.role]);

  return {
    canRender: Boolean(user && userProfile?.role),
    goBack: () => router.back(),
    handleDeleted: (result: MealDeleteResult) => {
      if (result.status === "completed" || result.status === "already_deleted") {
        router.replace("/archive");
      }
    },
    handleSelectMeal: (nextMealId: string) => {
      if (!meal || nextMealId === meal.id) {
        return;
      }
      router.replace(`/meals/${nextMealId}`);
    },
    loading,
    loadingMeal,
    meal,
    sameDayMeals,
  };
};
