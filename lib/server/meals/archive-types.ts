import { z } from "zod";

import { isUserRole, USER_ROLES, VALID_MEAL_TYPES } from "@/lib/domain/meal-policy";
import type { Meal, UserRole } from "@/lib/types";

export const ARCHIVE_PAGE_SIZE_DEFAULT = 24;
export const ARCHIVE_PAGE_SIZE_MAX = 48;
export const ARCHIVE_SCAN_BATCH_SIZE = 120;
export const ARCHIVE_SCAN_LIMIT = 2000;

const ArchiveCursorSchema = z.object({
  lastTimestamp: z.number().int().min(0),
  lastId: z.string().trim().min(1),
  mode: z.enum(["meal", "scan"]),
});

const ArchiveQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(VALID_MEAL_TYPES).optional(),
  participant: z.enum(USER_ROLES).optional(),
  limit: z.coerce.number().int().min(1).max(ARCHIVE_PAGE_SIZE_MAX).optional(),
  cursor: z.string().trim().optional(),
});

export type ArchiveQueryParams = {
  query: string;
  type?: Meal["type"];
  participant?: UserRole;
  limit: number;
  cursor: ArchiveCursor | null;
};

export type ArchiveCursor = z.infer<typeof ArchiveCursorSchema>;

export const encodeArchiveCursor = (
  lastTimestamp: number,
  lastId: string,
  mode: ArchiveCursor["mode"]
): string =>
  Buffer.from(JSON.stringify({ lastTimestamp, lastId, mode }), "utf8").toString("base64url");

export const decodeArchiveCursor = (cursor: string): ArchiveCursor => {
  try {
    return ArchiveCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    );
  } catch {
    throw new Error("Invalid archive cursor");
  }
};

export const parseArchiveQueryParams = (searchParams: URLSearchParams): ArchiveQueryParams => {
  const parsed = ArchiveQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    participant: searchParams.get("participant") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid archive query");
  }

  return {
    query: parsed.data.q?.trim() ?? "",
    type: parsed.data.type,
    participant: parsed.data.participant,
    limit: parsed.data.limit ?? ARCHIVE_PAGE_SIZE_DEFAULT,
    cursor: parsed.data.cursor ? decodeArchiveCursor(parsed.data.cursor) : null,
  };
};

export const matchesArchiveMeal = (
  meal: Meal,
  filters: Pick<ArchiveQueryParams, "query" | "type" | "participant">
): boolean => {
  const normalizedQuery = filters.query.trim().toLowerCase();

  if (filters.type && meal.type !== filters.type) {
    return false;
  }

  if (filters.participant && !meal.userIds?.includes(filters.participant)) {
    if (meal.userId !== filters.participant) {
      return false;
    }
  }

  if (!normalizedQuery) {
    return true;
  }

  return (
    meal.description.toLowerCase().includes(normalizedQuery) ||
    meal.type.toLowerCase().includes(normalizedQuery) ||
    Boolean(meal.userIds?.some((role) => isUserRole(role) && role.toLowerCase().includes(normalizedQuery))) ||
    Boolean(meal.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)))
  );
};
