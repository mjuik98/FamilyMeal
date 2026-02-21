import { Meal, UserRole } from "@/lib/types";

export const QA_MOCK_MODE_KEY = "familymeal:qa-mock-mode";

export const isQaEnabled =
  process.env.NEXT_PUBLIC_ENABLE_QA === "true" || process.env.NODE_ENV !== "production";

export const getQaDefaultRole = (): UserRole => "\uC544\uBE60" as UserRole;

export const isQaMockMode = () =>
  isQaEnabled &&
  typeof window !== "undefined" &&
  window.localStorage.getItem(QA_MOCK_MODE_KEY) === "true";

export const createQaMockMeals = (role: UserRole, date: Date): Meal[] => {
  const base = new Date(date);
  base.setHours(12, 30, 0, 0);
  const noon = base.getTime();

  return [
    {
      id: "qa-home-meal",
      ownerUid: "qa-user",
      userIds: [role],
      description: "\uD14C\uC2A4\uD2B8\uC6A9 \uC2DD\uC0AC \uAE30\uB85D\uC785\uB2C8\uB2E4.",
      type: "\uC810\uC2EC" as Meal["type"],
      timestamp: noon,
      commentCount: 1,
      comments: [
        {
          id: "qa-home-comment",
          author: role,
          authorUid: "qa-user",
          text: "\uB313\uAE00 \uC785\uB825 \uAC00\uB3C5\uC131 \uD14C\uC2A4\uD2B8",
          createdAt: noon - 60_000,
          updatedAt: noon - 60_000,
          timestamp: noon - 60_000,
        },
      ],
    },
  ];
};

export const qaMockWeeklyStats: ReadonlyArray<{ label: string; count: number }> = [
  { label: "\uC6D4", count: 2 },
  { label: "\uD654", count: 1 },
  { label: "\uC218", count: 3 },
  { label: "\uBAA9", count: 2 },
  { label: "\uAE08", count: 1 },
  { label: "\uD1A0", count: 2 },
  { label: "\uC77C", count: 1 },
];
