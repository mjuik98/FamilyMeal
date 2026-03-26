import { Meal, UserRole } from "@/lib/types";

export const QA_MOCK_MODE_KEY = "familymeal:qa-mock-mode";

export const isQaEnabled =
  process.env.NEXT_PUBLIC_ENABLE_QA === "true" || process.env.NODE_ENV !== "production";

export const isQaMockEnabledByEnv = (
  env: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV">> = process.env
) => env.NODE_ENV !== "production";

export const getQaDefaultRole = (): UserRole => "\uC544\uBE60" as UserRole;

export const isQaMockMode = () =>
  isQaMockEnabledByEnv() &&
  typeof window !== "undefined" &&
  window.localStorage.getItem(QA_MOCK_MODE_KEY) === "true";

export const createQaMockMeals = (role: UserRole, date: Date): Meal[] => {
  const base = new Date(date);
  base.setHours(12, 30, 0, 0);
  const noon = base.getTime();
  const breakfast = noon - 4 * 60 * 60 * 1000;
  const dinner = noon + 6 * 60 * 60 * 1000;

  return [
    {
      id: "qa-home-meal",
      ownerUid: "qa-user",
      userIds: [role],
      description: "\uD14C\uC2A4\uD2B8\uC6A9 \uC2DD\uC0AC \uAE30\uB85D\uC785\uB2C8\uB2E4.",
      type: "\uC810\uC2EC" as Meal["type"],
      timestamp: noon,
      commentCount: 1,
      reactions: {
        "❤️": ["qa-other"],
        "👏": ["qa-other-2"],
      },
      comments: [
        {
          id: "qa-home-comment",
          author: "\uC544\uBE60" as UserRole,
          authorUid: "qa-user",
          text: "\uB313\uAE00 \uC785\uB825 \uAC00\uB3C5\uC131 \uD14C\uC2A4\uD2B8",
          createdAt: noon - 60_000,
          updatedAt: noon - 60_000,
          timestamp: noon - 60_000,
          reactions: {
            "❤️": ["qa-other"],
          },
        },
      ],
    },
    {
      id: "qa-breakfast-meal",
      ownerUid: "qa-sibling",
      userIds: [role],
      description: "\uD1A0\uC2A4\uD2B8\uC640 \uACC4\uB780 \uC544\uCE68",
      type: "\uC544\uCE68" as Meal["type"],
      timestamp: breakfast,
      commentCount: 1,
      reactions: {
        "👍": ["qa-user", "qa-other"],
      },
      comments: [
        {
          id: "qa-breakfast-comment",
          author: role,
          authorUid: "qa-user",
          text: "\uC544\uCE68 \uC2DD\uB2E8 \uC131\uACF5",
          createdAt: breakfast + 60_000,
          updatedAt: breakfast + 60_000,
          timestamp: breakfast + 60_000,
          reactions: {
            "👏": ["qa-other"],
          },
        },
      ],
    },
    {
      id: "qa-shared-meal",
      ownerUid: "qa-mom",
      userIds: ["\uC5C4\uB9C8" as UserRole],
      description: "\uC5C4\uB9C8\uAC00 \uB9CC\uB4E0 \uC800\uB141 \uC2DD\uC0AC",
      type: "\uC800\uB141" as Meal["type"],
      timestamp: dinner,
      commentCount: 2,
      reactions: {
        "🔥": ["qa-user"],
      },
      comments: [
        {
          id: "qa-shared-comment-1",
          author: "\uC5C4\uB9C8" as UserRole,
          authorUid: "qa-mom",
          text: "\uB0A8\uAE40\uC5C6\uC774 \uBA39\uC5C8\uC5B4\uC694",
          createdAt: dinner + 60_000,
          updatedAt: dinner + 60_000,
          timestamp: dinner + 60_000,
          reactions: {
            "😋": ["qa-user"],
          },
        },
        {
          id: "qa-shared-comment-2",
          author: "\uC5C4\uB9C8" as UserRole,
          authorUid: "qa-mom",
          text: "\uB2E4\uC74C\uC5D0 \uB610 \uD574\uC694",
          createdAt: dinner + 120_000,
          updatedAt: dinner + 120_000,
          timestamp: dinner + 120_000,
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
