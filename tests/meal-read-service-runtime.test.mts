import assert from "node:assert/strict";
import { mock, test } from "node:test";

import type { Meal, WeeklyMealStat } from "../lib/types";

const TEST_NOW = Date.UTC(2026, 3, 4, 12, 0, 0, 0);

const qaMeals: Meal[] = [
  {
    id: "qa-meal",
    ownerUid: "qa-owner",
    userIds: ["엄마"],
    description: "qa meal",
    type: "점심",
    timestamp: TEST_NOW,
    commentCount: 0,
    reactions: {},
  },
];

const remoteMeals: Meal[] = [
  {
    id: "remote-meal",
    ownerUid: "owner-1",
    userIds: ["엄마"],
    description: "remote meal",
    type: "저녁",
    timestamp: TEST_NOW,
    commentCount: 0,
    reactions: {},
  },
];

const qaStats: WeeklyMealStat[] = [
  {
    date: new Date(TEST_NOW),
    label: "토",
    count: 2,
  },
];

const remoteStats: WeeklyMealStat[] = [
  {
    date: new Date(TEST_NOW),
    label: "토",
    count: 1,
  },
];

const archiveResponse = {
  meals: remoteMeals,
  nextCursor: "next-cursor",
  hasMore: true,
  isPartial: false,
};

const callLog = {
  subscribeCalls: 0,
  archiveCalls: 0,
  qaArchiveCalls: 0,
  weeklyCalls: 0,
  qaWeeklyCalls: 0,
};

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/client/meal-queries", {
  ...mockModuleOptions({
    subscribeMealsForDate: (
      _date: Date,
      onMeals: (meals: Meal[]) => void
    ) => {
      callLog.subscribeCalls += 1;
      onMeals(remoteMeals);
      return () => undefined;
    },
    getWeeklyStats: async () => {
      callLog.weeklyCalls += 1;
      return remoteStats;
    },
    listArchiveMeals: async () => {
      callLog.archiveCalls += 1;
      return archiveResponse;
    },
    getMealById: async () => remoteMeals[0],
    getMealsForDate: async () => remoteMeals,
  }),
});

mock.module("@/lib/qa/adapters/meals", {
  ...mockModuleOptions({
    isQaMealsRuntimeActive: () => false,
    getQaMealsForDate: () => qaMeals,
    getQaWeeklyStats: () => {
      callLog.qaWeeklyCalls += 1;
      return qaStats;
    },
    getQaArchiveMeals: () => {
      callLog.qaArchiveCalls += 1;
      return qaMeals;
    },
    getQaMealDetail: () => qaMeals[0],
    getQaSameDayMeals: () => qaMeals,
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("watchMealsForViewerDate reads QA meals without subscribing to remote data", async () => {
  const service = await importFresh<typeof import("../lib/features/meals/application/meal-read-service.ts")>(
    "../lib/features/meals/application/meal-read-service.ts"
  );

  const seen: Meal[][] = [];
  service.watchMealsForViewerDate({
    date: new Date(TEST_NOW),
    role: "엄마",
    runtimeState: {
      qaMode: true,
      qaAnchorDate: new Date(TEST_NOW),
    },
    onMeals: (meals) => {
      seen.push(meals);
    },
  });

  assert.deepEqual(seen, [qaMeals]);
  assert.equal(callLog.subscribeCalls, 0);
});

test("loadArchiveMealsForViewer and loadWeeklyStatsForViewer delegate to runtime-specific sources", async () => {
  const service = await importFresh<typeof import("../lib/features/meals/application/meal-read-service.ts")>(
    "../lib/features/meals/application/meal-read-service.ts"
  );

  const remoteArchive = await service.loadArchiveMealsForViewer({
    role: "엄마",
    runtimeState: {
      qaMode: false,
      qaAnchorDate: new Date(TEST_NOW),
    },
    query: "meal",
    type: "전체",
    participant: "전체",
    limit: 24,
  });
  const qaArchive = await service.loadArchiveMealsForViewer({
    role: "엄마",
    runtimeState: {
      qaMode: true,
      qaAnchorDate: new Date(TEST_NOW),
    },
    query: "",
    type: "전체",
    participant: "전체",
    limit: 24,
  });

  const remoteWeekly = await service.loadWeeklyStatsForViewer({
    role: "엄마",
    date: new Date(TEST_NOW),
    runtimeState: {
      qaMode: false,
      qaAnchorDate: new Date(TEST_NOW),
    },
  });
  const qaWeekly = await service.loadWeeklyStatsForViewer({
    role: "엄마",
    date: new Date(TEST_NOW),
    runtimeState: {
      qaMode: true,
      qaAnchorDate: new Date(TEST_NOW),
    },
  });

  assert.deepEqual(remoteArchive, archiveResponse);
  assert.deepEqual(qaArchive, {
    meals: qaMeals,
    nextCursor: null,
    hasMore: false,
    isPartial: false,
  });
  assert.deepEqual(remoteWeekly, remoteStats);
  assert.deepEqual(qaWeekly, qaStats);
  assert.equal(callLog.archiveCalls, 1);
  assert.equal(callLog.qaArchiveCalls, 1);
  assert.equal(callLog.weeklyCalls, 1);
  assert.equal(callLog.qaWeeklyCalls, 1);
});
