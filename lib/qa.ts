import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from "@/lib/activity";
import { Meal, NotificationPreferences, UserActivity, UserRole, WeeklyMealStat } from "@/lib/types";

export const QA_MOCK_MODE_KEY = "familymeal:qa-mock-mode";
export const QA_NOTIFICATION_PREFS_KEY = "familymeal:qa-notification-prefs";
export const QA_ACTIVITY_READ_IDS_KEY = "familymeal:qa-activity-read-ids";
export const QA_CUSTOM_MEALS_KEY = "familymeal:qa-custom-meals";

export const isQaEnabled =
  process.env.NEXT_PUBLIC_ENABLE_QA === "true" || process.env.NODE_ENV !== "production";

export const isQaMockEnabledByEnv = (
  env: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV">> = process.env
) => env.NODE_ENV !== "production";

export const getQaDefaultRole = (): UserRole => "아빠" as UserRole;

export const isQaMockMode = () =>
  isQaMockEnabledByEnv() &&
  typeof window !== "undefined" &&
  window.localStorage.getItem(QA_MOCK_MODE_KEY) === "true";

const QA_WEEKLY_COUNTS = [2, 1, 1, 1, 0, 1, 4] as const;
const QA_WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const getWeekStart = (referenceDate: Date) => {
  const base = new Date(referenceDate);
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  base.setDate(base.getDate() - day);
  return base;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getDayKey = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;

const createQaImage = (
  emoji: string,
  title: string,
  start: string,
  end: string
) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <circle cx="1020" cy="170" r="120" fill="rgba(255,255,255,0.14)"/>
      <circle cx="180" cy="760" r="150" fill="rgba(255,255,255,0.09)"/>
      <text x="90" y="150" fill="rgba(255,255,255,0.82)" font-size="48" font-family="Arial, sans-serif">${title}</text>
      <text x="90" y="540" fill="white" font-size="280" font-family="Arial, sans-serif">${emoji}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createQaHistoricMeals = (role: UserRole, referenceDate: Date): Meal[] => {
  const weekStart = getWeekStart(referenceDate);
  const makeDate = (offset: number, hour: number, minute = 0) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
  };

  return [
    {
      id: "qa-week-sun-breakfast",
      ownerUid: "qa-mom",
      userIds: ["엄마" as UserRole, role],
      imageUrl: createQaImage("🥞", "주말 브런치", "#ffb347", "#ff7f50"),
      description: "주말 브런치로 팬케이크와 과일을 먹었어요.",
      type: "아침",
      timestamp: makeDate(0, 10, 30),
      commentCount: 0,
      reactions: {},
    },
    {
      id: "qa-week-sun-dinner",
      ownerUid: "qa-dad",
      userIds: [role, "엄마" as UserRole],
      imageUrl: createQaImage("🍲", "따뜻한 저녁", "#7f5af0", "#2cb67d"),
      description: "뜨끈한 국물 요리로 하루를 마무리했어요.",
      type: "저녁",
      timestamp: makeDate(0, 18, 20),
      commentCount: 1,
      reactions: { "❤️": ["qa-mom"] },
    },
    {
      id: "qa-week-mon-lunch",
      ownerUid: "qa-mom",
      userIds: ["엄마" as UserRole],
      imageUrl: createQaImage("🍱", "월요일 점심", "#34d399", "#059669"),
      description: "엄마가 도시락처럼 정갈하게 담아준 점심이에요.",
      type: "점심",
      timestamp: makeDate(1, 12, 40),
      commentCount: 0,
      reactions: {},
    },
    {
      id: "qa-week-tue-snack",
      ownerUid: "qa-mom",
      userIds: ["엄마" as UserRole],
      imageUrl: createQaImage("🧁", "간식 타임", "#f472b6", "#fb7185"),
      description: "엄마가 준비한 달콤한 간식 시간이었어요.",
      type: "간식",
      timestamp: makeDate(2, 16, 10),
      commentCount: 0,
      reactions: { "👍": ["qa-user"] },
    },
    {
      id: "qa-week-wed-dinner",
      ownerUid: "qa-son",
      userIds: ["아들" as UserRole, role],
      imageUrl: createQaImage("🍝", "평일 저녁", "#60a5fa", "#2563eb"),
      description: "간단한 파스타로 빠르게 저녁을 준비했어요.",
      type: "저녁",
      timestamp: makeDate(3, 19, 0),
      commentCount: 0,
      reactions: {},
    },
    {
      id: "qa-week-fri-lunch",
      ownerUid: "qa-daughter",
      userIds: ["딸" as UserRole, role],
      imageUrl: createQaImage("🥗", "가벼운 점심", "#a3e635", "#65a30d"),
      description: "샐러드와 샌드위치로 가볍게 먹은 점심이에요.",
      type: "점심",
      timestamp: makeDate(5, 12, 15),
      commentCount: 0,
      reactions: {},
    },
  ];
};

const createQaArchiveBacklogMeals = (role: UserRole, referenceDate: Date): Meal[] => {
  const previousMonthBase = new Date(referenceDate);
  previousMonthBase.setMonth(previousMonthBase.getMonth() - 1);
  previousMonthBase.setDate(18);
  previousMonthBase.setHours(12, 0, 0, 0);

  const earlyPreviousMonth = new Date(previousMonthBase);
  earlyPreviousMonth.setDate(earlyPreviousMonth.getDate() - 8);
  earlyPreviousMonth.setHours(19, 10, 0, 0);

  return [
    {
      id: "qa-archive-feb-lunch",
      ownerUid: "qa-dad",
      userIds: [role, "딸" as UserRole],
      imageUrl: createQaImage("🍜", "지난달 점심", "#f97316", "#fb923c"),
      description: "칼국수로 든든하게 먹었던 지난달 점심이에요.",
      type: "점심",
      timestamp: previousMonthBase.getTime(),
      commentCount: 0,
      reactions: {},
    },
    {
      id: "qa-archive-feb-dinner",
      ownerUid: "qa-son",
      userIds: [role, "아들" as UserRole],
      imageUrl: createQaImage("🍣", "지난달 저녁", "#0f766e", "#14b8a6"),
      description: "초밥으로 조금 특별하게 먹은 저녁 기록입니다.",
      type: "저녁",
      timestamp: earlyPreviousMonth.getTime(),
      commentCount: 1,
      reactions: { "❤️": ["qa-family"] },
    },
  ];
};

const createQaTodayMeals = (
  role: UserRole,
  referenceDate: Date,
  focalDate: Date = new Date()
): Meal[] => {
  const weekStart = getWeekStart(referenceDate);
  const base = new Date(weekStart);
  base.setDate(weekStart.getDate() + focalDate.getDay());
  base.setHours(12, 30, 0, 0);
  const noon = base.getTime();
  const breakfast = noon - 4 * 60 * 60 * 1000;
  const dinner = noon + 6 * 60 * 60 * 1000;

  return [
    {
      id: "qa-home-meal",
      ownerUid: "qa-user",
      userIds: [role],
      imageUrl: createQaImage("🍛", "오늘의 점심", "#d97706", "#facc15"),
      description: "테스트용 식사 기록입니다.",
      type: "점심" as Meal["type"],
      timestamp: noon,
      commentCount: 1,
      reactions: {
        "❤️": ["qa-other"],
        "👏": ["qa-other-2"],
      },
      comments: [
        {
          id: "qa-home-comment",
          author: "아빠" as UserRole,
          authorUid: "qa-user",
          text: "댓글 입력 가독성 테스트",
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
      imageUrl: createQaImage("🍞", "아침 토스트", "#f59e0b", "#ef4444"),
      description: "토스트와 계란 아침",
      type: "아침" as Meal["type"],
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
          text: "아침 식단 성공",
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
      userIds: ["엄마" as UserRole],
      imageUrl: createQaImage("🍲", "엄마의 저녁", "#0ea5e9", "#2563eb"),
      description: "엄마가 만든 저녁 식사",
      type: "저녁" as Meal["type"],
      timestamp: dinner,
      commentCount: 2,
      reactions: {
        "🔥": ["qa-user"],
      },
      comments: [
        {
          id: "qa-shared-comment-1",
          author: "엄마" as UserRole,
          authorUid: "qa-mom",
          text: "남김없이 먹었어요",
          createdAt: dinner + 60_000,
          updatedAt: dinner + 60_000,
          timestamp: dinner + 60_000,
          reactions: {
            "😋": ["qa-user"],
          },
        },
        {
          id: "qa-shared-comment-2",
          author: "엄마" as UserRole,
          authorUid: "qa-mom",
          text: "다음에 또 해요",
          createdAt: dinner + 120_000,
          updatedAt: dinner + 120_000,
          timestamp: dinner + 120_000,
        },
      ],
    },
    {
      id: "qa-snack-meal",
      ownerUid: "qa-daughter",
      userIds: ["딸" as UserRole, role],
      imageUrl: createQaImage("🍎", "오늘의 간식", "#22c55e", "#16a34a"),
      description: "간단한 간식 시간",
      type: "간식" as Meal["type"],
      timestamp: dinner + 2 * 60 * 60 * 1000,
      commentCount: 3,
      reactions: {
        "❤️": ["qa-mom", "qa-son"],
        "🔥": ["qa-user"],
      },
      comments: [
        {
          id: "qa-snack-comment-1",
          author: "딸" as UserRole,
          authorUid: "qa-daughter",
          text: "다음 간식도 준비할게요",
          createdAt: dinner + 2 * 60 * 60 * 1000 + 30_000,
          updatedAt: dinner + 2 * 60 * 60 * 1000 + 30_000,
          reactions: {
            "👏": ["qa-user", "qa-mom"],
          },
        },
        {
          id: "qa-snack-comment-2",
          author: role,
          authorUid: "qa-user",
          text: "사과 칩 조합 좋아요",
          parentId: "qa-snack-comment-1",
          mentionedAuthor: "딸" as UserRole,
          createdAt: dinner + 2 * 60 * 60 * 1000 + 60_000,
          updatedAt: dinner + 2 * 60 * 60 * 1000 + 60_000,
        },
        {
          id: "qa-snack-comment-3",
          author: "엄마" as UserRole,
          authorUid: "qa-mom",
          text: "다음에는 과일 추가해요",
          createdAt: dinner + 2 * 60 * 60 * 1000 + 90_000,
          updatedAt: dinner + 2 * 60 * 60 * 1000 + 90_000,
        },
      ],
    },
  ];
};

export const createQaMockWeekMeals = (
  role: UserRole,
  referenceDate: Date,
  focalDate: Date = new Date()
): Meal[] => {
  const todayMeals = createQaTodayMeals(role, referenceDate, focalDate);
  const historicMeals = createQaHistoricMeals(role, referenceDate);
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const customMeals = normalizeQaCustomMeals(readJsonFromStorage(QA_CUSTOM_MEALS_KEY, [])).filter(
    (meal) => meal.timestamp >= weekStart.getTime() && meal.timestamp <= weekEnd.getTime()
  );

  return [...todayMeals, ...historicMeals, ...customMeals].sort((a, b) => b.timestamp - a.timestamp);
};

export const createQaMockMeals = (
  role: UserRole,
  date: Date,
  focalDate: Date = new Date()
): Meal[] => createQaMockWeekMeals(role, date, focalDate).filter((meal) => isSameDay(new Date(meal.timestamp), date));

export const getQaMockMealById = (
  role: UserRole,
  mealId: string,
  referenceDate: Date = new Date(),
  focalDate: Date = new Date()
) => createQaMockRecentMeals(role, referenceDate, focalDate).find((meal) => meal.id === mealId) ?? null;

export const createQaMockRecentMeals = (
  role: UserRole,
  referenceDate: Date = new Date(),
  focalDate: Date = new Date()
) => {
  const weekMeals = createQaMockWeekMeals(role, referenceDate, focalDate);
  const archiveBacklogMeals = createQaArchiveBacklogMeals(role, referenceDate);
  return [...weekMeals, ...archiveBacklogMeals].sort((a, b) => b.timestamp - a.timestamp);
};

export const createQaMockActivities = (
  role: UserRole,
  readIds: string[] = []
): UserActivity[] => {
  const now = Date.now();
  const readSet = new Set(readIds);

  const withReadState = (activity: Omit<UserActivity, "readAt">): UserActivity => ({
    ...activity,
    readAt: readSet.has(activity.id) ? now : null,
  });

  return [
    withReadState({
      id: "qa-activity-meal-comment",
      type: "meal-comment",
      actorUid: "qa-mom",
      actorRole: "엄마" as UserRole,
      mealId: "qa-home-meal",
      preview: "국물도 맛있었어요",
      createdAt: now - 3 * 60_000,
    }),
    withReadState({
      id: "qa-activity-reply",
      type: "comment-reply",
      actorUid: "qa-son",
      actorRole: "아들" as UserRole,
      mealId: "qa-home-meal",
      commentId: "qa-home-comment",
      preview: "저도 같은 생각이에요",
      createdAt: now - 2 * 60_000,
    }),
    withReadState({
      id: "qa-activity-meal-reaction",
      type: "meal-reaction",
      actorUid: "qa-mom",
      actorRole: "엄마" as UserRole,
      mealId: "qa-home-meal",
      reactionEmoji: "❤️",
      preview: "테스트용 식사 기록입니다.",
      createdAt: now - 90_000,
    }),
    withReadState({
      id: "qa-activity-comment-reaction",
      type: "comment-reaction",
      actorUid: "qa-daughter",
      actorRole: "딸" as UserRole,
      mealId: "qa-breakfast-meal",
      commentId: "qa-breakfast-comment",
      reactionEmoji: "👏",
      preview: "아침 식단 성공",
      createdAt: now - 30_000,
    }),
    withReadState({
      id: "qa-activity-old-read",
      type: "meal-comment",
      actorUid: "qa-mom",
      actorRole: "엄마" as UserRole,
      mealId: "qa-shared-meal",
      preview: "이 항목은 이미 읽음처리 대상입니다",
      createdAt: now - 24 * 60 * 60_000,
    }),
  ].map((activity, index) =>
    activity.id === "qa-activity-old-read"
      ? { ...activity, readAt: now - (index + 1) * 1_000 }
      : activity
  );
};

const readJsonFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const normalizeQaCustomMeals = (rawMeals: unknown): Meal[] => {
  if (!Array.isArray(rawMeals)) return [];

  const normalized = rawMeals.map((meal): Meal | null => {
      const raw = meal as Partial<Meal>;
      if (
        typeof raw.id !== "string" ||
        typeof raw.description !== "string" ||
        typeof raw.type !== "string" ||
        typeof raw.timestamp !== "number"
      ) {
        return null;
      }

      return {
        id: raw.id,
        ownerUid: typeof raw.ownerUid === "string" ? raw.ownerUid : undefined,
        userIds: Array.isArray(raw.userIds)
          ? raw.userIds.filter((role): role is UserRole => typeof role === "string")
          : [],
        imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
        description: raw.description,
        type: raw.type as Meal["type"],
        timestamp: raw.timestamp,
        commentCount: typeof raw.commentCount === "number" ? raw.commentCount : 0,
        comments: Array.isArray(raw.comments) ? raw.comments : [],
        reactions: typeof raw.reactions === "object" && raw.reactions ? raw.reactions : {},
      };
    })
    .filter((meal): meal is Meal => meal !== null);

  return normalized;
};

export const getQaNotificationPreferences = (): NotificationPreferences =>
  normalizeNotificationPreferences(readJsonFromStorage(QA_NOTIFICATION_PREFS_KEY, DEFAULT_NOTIFICATION_PREFERENCES));

export const setQaNotificationPreferences = (prefs: NotificationPreferences) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QA_NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
};

export const getQaReadActivityIds = (): string[] =>
  readJsonFromStorage<string[]>(QA_ACTIVITY_READ_IDS_KEY, []);

export const setQaReadActivityIds = (activityIds: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QA_ACTIVITY_READ_IDS_KEY, JSON.stringify(activityIds));
};

export const addQaCustomMeal = (meal: Meal) => {
  if (typeof window === "undefined") return;
  const currentMeals = normalizeQaCustomMeals(readJsonFromStorage(QA_CUSTOM_MEALS_KEY, []));
  window.localStorage.setItem(QA_CUSTOM_MEALS_KEY, JSON.stringify([meal, ...currentMeals]));
};

export const createQaMockWeeklyStats = (
  referenceDate: Date,
  role: UserRole = getQaDefaultRole(),
  focalDate: Date = new Date()
): WeeklyMealStat[] => {
  const weekStart = getWeekStart(referenceDate);
  const meals = createQaMockWeekMeals(role, referenceDate, focalDate);
  const countByDay = new Map<string, number>();

  meals.forEach((meal) => {
    const key = getDayKey(new Date(meal.timestamp));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  });

  return QA_WEEKLY_COUNTS.map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const preview = meals.find((meal) => isSameDay(new Date(meal.timestamp), date) && meal.imageUrl);
    const count = countByDay.get(getDayKey(date)) ?? 0;

    return {
      date,
      label: QA_WEEKDAY_LABELS[date.getDay()],
      count,
      previewImageUrl: preview?.imageUrl,
    };
  });
};
