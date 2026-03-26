import type { Meal, UserRole } from "@/lib/types";

export const buildAutoMealDescription = (
  mealType: Meal["type"],
  participants: UserRole[]
): string => {
  if (participants.length === 0) return `${mealType} 기록`;
  if (participants.length === 1) return `${participants[0]}와 함께한 ${mealType} 기록`;
  if (participants.length === 2) return `${participants[0]}와 ${participants[1]}가 함께한 ${mealType} 기록`;
  return `${participants[0]} 외 ${participants.length - 1}명이 함께한 ${mealType} 기록`;
};
