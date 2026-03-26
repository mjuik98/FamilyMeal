"use client";

import { Clock, Images, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Meal } from "@/lib/types";

export default function MealPhotoStage({
  meal,
  sameDayMeals,
  onSelectMeal,
}: {
  meal: Meal;
  sameDayMeals: Meal[];
  onSelectMeal?: (mealId: string) => void;
}) {
  const [loadedMealId, setLoadedMealId] = useState<string | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const railMeals = useMemo(
    () => (sameDayMeals.length > 0 ? sameDayMeals : [meal]),
    [meal, sameDayMeals]
  );
  const imgLoaded = loadedMealId === meal.id;

  useEffect(() => {
    if (!isImageExpanded) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsImageExpanded(false);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isImageExpanded]);

  return (
    <section className="meal-photo-stage surface-card" data-testid="meal-photo-stage">
      {meal.imageUrl ? (
        <button
          type="button"
          onClick={() => setIsImageExpanded(true)}
          className="meal-photo-stage-hero"
          style={{ cursor: "zoom-in" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.imageUrl}
            alt={meal.description}
            loading="lazy"
            onLoad={() => setLoadedMealId(meal.id)}
            className="meal-photo-stage-image"
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
          <span className="meal-photo-stage-overlay">
            <Images size={16} /> 사진 크게 보기
          </span>
        </button>
      ) : (
        <div className="meal-photo-stage-hero meal-photo-stage-hero-empty">🍽️</div>
      )}

      {isImageExpanded && meal.imageUrl && (
        <div onClick={() => setIsImageExpanded(false)} className="image-overlay" style={{ cursor: "zoom-out" }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsImageExpanded(false);
            }}
            className="image-overlay-close"
          >
            <X size={24} />
          </button>

          <div onClick={(event) => event.stopPropagation()} className="image-overlay-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meal.imageUrl} alt={meal.description} className="image-overlay-image" />
          </div>
        </div>
      )}

      {railMeals.length > 1 && (
        <div className="meal-photo-rail">
          {railMeals.map((item) => {
            const itemTime = new Date(item.timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const active = item.id === meal.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMeal?.(item.id)}
                className={`meal-photo-rail-item${active ? " meal-photo-rail-item-active" : ""}`}
                data-testid={`meal-photo-rail-item-${item.id}`}
                data-active={active ? "true" : "false"}
                disabled={active}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.description} className="meal-photo-rail-thumb" />
                ) : (
                  <span className="meal-photo-rail-thumb meal-photo-rail-thumb-empty">🍽️</span>
                )}
                <span className="meal-photo-rail-copy">
                  <strong>{item.type}</strong>
                  <span className="meta-inline">
                    <Clock size={11} /> {itemTime}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
