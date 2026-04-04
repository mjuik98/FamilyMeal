import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const TEST_NOW = Date.UTC(2026, 3, 4, 12, 0, 0, 0);

type StoredMealRecord = {
  id: string;
  ownerUid?: string;
  userId?: string;
  userIds?: string[];
  description: string;
  type: string;
  imageUrl?: string;
  timestamp: number;
  commentCount?: number;
};

type QueryFilter = {
  field: string;
  op: string;
  value: unknown;
};

const mealRecords: StoredMealRecord[] = [];

const toMillis = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  throw new Error("Unsupported timestamp value");
};

class MockMealQuery {
  constructor(
    private readonly records: StoredMealRecord[],
    private readonly filters: QueryFilter[] = [],
    private readonly orderDirection: "asc" | "desc" = "asc"
  ) {}

  where(field: string, op: string, value: unknown) {
    return new MockMealQuery(this.records, [...this.filters, { field, op, value }], this.orderDirection);
  }

  orderBy(_field: string, direction: "asc" | "desc" = "asc") {
    return new MockMealQuery(this.records, this.filters, direction);
  }

  async get() {
    const docs = this.records
      .filter((record) =>
        this.filters.every((filter) => {
          const candidate = record[filter.field as keyof StoredMealRecord];
          if (filter.field === "timestamp") {
            const candidateMillis = toMillis(candidate);
            const filterMillis = toMillis(filter.value);
            if (filter.op === ">=") return candidateMillis >= filterMillis;
            if (filter.op === "<=") return candidateMillis <= filterMillis;
          }
          return true;
        })
      )
      .sort((left, right) =>
        this.orderDirection === "desc" ? right.timestamp - left.timestamp : left.timestamp - right.timestamp
      )
      .map((record) => ({
        id: record.id,
        data: () => ({
          ownerUid: record.ownerUid,
          userId: record.userId,
          userIds: record.userIds,
          description: record.description,
          type: record.type,
          imageUrl: record.imageUrl,
          timestamp: { toMillis: () => record.timestamp },
          commentCount: record.commentCount ?? 0,
        }),
      }));

    return {
      empty: docs.length === 0,
      docs,
      size: docs.length,
    };
  }
}

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/firebase-admin", {
  ...mockModuleOptions({
    adminDb: {
      collection: (name: string) => {
        if (name !== "meals") {
          throw new Error(`Unsupported collection: ${name}`);
        }
        return new MockMealQuery(mealRecords);
      },
    },
  }),
});

mock.module("next/server", {
  ...mockModuleOptions({
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(body), {
          status: init?.status ?? 200,
          headers: { "content-type": "application/json" },
        }),
    },
  }),
});

mock.module("@/lib/server/route-auth", {
  ...mockModuleOptions({
    requireValidatedUserRole: async () => ({
      user: { uid: "user-1" },
      role: "엄마",
    }),
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  mealRecords.length = 0;
});

test("listMealsForDate returns only visible meals for the actor role including legacy meals", async () => {
  mealRecords.push(
    {
      id: "visible-modern",
      ownerUid: "owner-1",
      userIds: ["엄마", "아빠"],
      description: "함께 먹은 점심",
      type: "점심",
      timestamp: TEST_NOW,
      commentCount: 1,
    },
    {
      id: "visible-legacy",
      userId: "엄마",
      userIds: [],
      description: "레거시 기록",
      type: "저녁",
      timestamp: TEST_NOW - 60_000,
      commentCount: 0,
    },
    {
      id: "hidden-other-role",
      ownerUid: "owner-2",
      userIds: ["아들"],
      description: "보이면 안 되는 기록",
      type: "간식",
      timestamp: TEST_NOW - 120_000,
      commentCount: 0,
    }
  );

  const mealUseCases = await importFresh<typeof import("../lib/server/meals/meal-use-cases.ts")>(
    "../lib/server/meals/meal-use-cases.ts"
  );

  const meals = await mealUseCases.listMealsForDate({
    actorRole: "엄마",
    date: new Date(TEST_NOW),
  });

  assert.deepEqual(
    meals.map((meal) => meal.id),
    ["visible-modern", "visible-legacy"]
  );
});

test("listWeeklyMealStats aggregates only visible meals within the selected week", async () => {
  mealRecords.push(
    {
      id: "sun-1",
      ownerUid: "owner-1",
      userIds: ["엄마"],
      description: "일요일 기록",
      type: "아침",
      imageUrl: "https://example.com/sun.jpg",
      timestamp: Date.UTC(2026, 2, 29, 8, 0, 0, 0),
      commentCount: 0,
    },
    {
      id: "sat-1",
      ownerUid: "owner-1",
      userIds: ["엄마", "아빠"],
      description: "토요일 기록",
      type: "점심",
      timestamp: Date.UTC(2026, 3, 4, 13, 0, 0, 0),
      commentCount: 0,
    },
    {
      id: "sat-hidden",
      ownerUid: "owner-2",
      userIds: ["아들"],
      description: "보이면 안 되는 주간 기록",
      type: "저녁",
      timestamp: Date.UTC(2026, 3, 4, 19, 0, 0, 0),
      commentCount: 0,
    }
  );

  const mealUseCases = await importFresh<typeof import("../lib/server/meals/meal-use-cases.ts")>(
    "../lib/server/meals/meal-use-cases.ts"
  );

  const stats = await mealUseCases.listWeeklyMealStats({
    actorRole: "엄마",
    referenceDate: new Date(TEST_NOW),
  });

  assert.equal(stats.length, 7);
  assert.equal(stats[0]?.count, 1);
  assert.equal(stats[0]?.previewImageUrl, "https://example.com/sun.jpg");
  assert.equal(stats[6]?.count, 1);
});

test("meal route exposes authenticated GET date reads", async () => {
  mealRecords.push({
    id: "route-visible",
    ownerUid: "owner-1",
    userIds: ["엄마"],
    description: "라우트 기록",
    type: "점심",
    timestamp: TEST_NOW,
    commentCount: 0,
  });

  const mealRoute = await importFresh<typeof import("../app/api/meals/route.ts")>(
    "../app/api/meals/route.ts"
  );

  const response = await mealRoute.GET!(
    new Request(`http://localhost/api/meals?date=2026-04-04`)
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { ok?: boolean; meals?: Array<{ id: string }> };
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.meals?.map((meal) => meal.id), ["route-visible"]);
});
