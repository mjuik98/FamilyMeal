import type { UserRole } from "@/lib/types";

export const USER_ROLES = ["아빠", "엄마", "딸", "아들"] as const satisfies readonly UserRole[];

export const VALID_USER_ROLE_SET = new Set<UserRole>(USER_ROLES);

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && VALID_USER_ROLE_SET.has(value as UserRole);
