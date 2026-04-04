import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import type { Meal } from "../lib/types";

const TEST_NOW = Date.UTC(2026, 3, 4, 12, 0, 0, 0);

const addMealCalls: Array<Record<string, unknown>> = [];
const updateMealCalls: Array<Record<string, unknown>> = [];
const cleanupCalls: string[] = [];
const qaSavedMeals: Meal[] = [];

let shouldFailCreate = false;
let shouldFailUpdate = false;

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/client/meal-mutations", {
  ...mockModuleOptions({
    addMeal: async (payload: Record<string, unknown>) => {
      addMealCalls.push(payload);
      if (shouldFailCreate) {
        throw new Error("create failed");
      }
      return { id: "created-meal", ...payload };
    },
    updateMeal: async (mealId: string, payload: Record<string, unknown>) => {
      updateMealCalls.push({ mealId, ...payload });
      if (shouldFailUpdate) {
        throw new Error("update failed");
      }
      return { id: mealId, ...payload };
    },
    deleteMeal: async () => ({
      deleted: true,
      status: "completed" as const,
    }),
  }),
});

mock.module("@/lib/client/meal-queries", {
  ...mockModuleOptions({
    getMealById: async (mealId: string) =>
      mealId === "legacy"
        ? {
            id: "legacy",
            userIds: ["엄마"],
            description: "legacy meal",
            type: "점심",
            imageUrl: "https://example.com/legacy.jpg",
            timestamp: TEST_NOW,
            commentCount: 0,
            reactions: {},
          }
        : {
            id: "owned",
            ownerUid: "user-1",
            userIds: ["엄마"],
            description: "owned meal",
            type: "점심",
            imageUrl: "https://example.com/owned.jpg",
            timestamp: TEST_NOW,
            commentCount: 0,
            reactions: {},
          },
  }),
});

mock.module("@/lib/uploadImage", {
  ...mockModuleOptions({
    uploadImage: async () => "https://example.com/uploaded.jpg",
    cleanupUploadedMealImage: async (imageUrl: string) => {
      cleanupCalls.push(imageUrl);
    },
  }),
});

mock.module("@/lib/meal-form", {
  ...mockModuleOptions({
    readMealImageDataUrl: async () => "data:image/jpeg;base64,qa",
  }),
});

mock.module("@/lib/qa/adapters/meals", {
  ...mockModuleOptions({
    isQaMealsRuntimeActive: () => false,
    saveQaMeal: (meal: Meal) => {
      qaSavedMeals.push(meal);
    },
    deleteQaMeal: () => undefined,
  }),
});

mock.module("@/lib/logging", {
  ...mockModuleOptions({
    logError: () => undefined,
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

afterEach(() => {
  addMealCalls.length = 0;
  updateMealCalls.length = 0;
  cleanupCalls.length = 0;
  qaSavedMeals.length = 0;
  shouldFailCreate = false;
  shouldFailUpdate = false;
});

test("createMealRecord cleans up uploaded image when saving the meal fails", async () => {
  shouldFailCreate = true;
  const service = await importFresh<typeof import("../lib/features/meals/application/meal-editor-service.ts")>(
    "../lib/features/meals/application/meal-editor-service.ts"
  );

  await assert.rejects(
    () =>
      service.createMealRecord({
        userUid: "user-1",
        selectedUsers: ["엄마"],
        description: "new meal",
        autoDescription: "auto meal",
        type: "점심",
        imageFile: {} as File,
        recordDate: new Date(TEST_NOW),
        runtimeState: {
          qaMode: false,
          qaAnchorDate: new Date(TEST_NOW),
        },
      }),
    /create failed/
  );

  assert.deepEqual(cleanupCalls, ["https://example.com/uploaded.jpg"]);
});

test("createMealRecord saves QA meals without remote upload and loadEditableMeal marks legacy records", async () => {
  const service = await importFresh<typeof import("../lib/features/meals/application/meal-editor-service.ts")>(
    "../lib/features/meals/application/meal-editor-service.ts"
  );

  await service.createMealRecord({
    userUid: "user-1",
    selectedUsers: ["엄마"],
    description: "",
    autoDescription: "auto meal",
    type: "점심",
    imageFile: {} as File,
    recordDate: new Date(TEST_NOW),
    runtimeState: {
      qaMode: true,
      qaAnchorDate: new Date(TEST_NOW),
    },
  });

  const legacy = await service.loadEditableMeal({
    mealId: "legacy",
    currentUid: "user-1",
    currentRole: "엄마",
  });

  assert.equal(qaSavedMeals.length, 1);
  assert.equal(addMealCalls.length, 0);
  assert.equal(legacy.requiresLegacyMigration, true);
  assert.equal(legacy.selectedUsers[0], "엄마");
});

test("updateExistingMealRecord cleans up uploaded image when updating the meal fails", async () => {
  shouldFailUpdate = true;
  const service = await importFresh<typeof import("../lib/features/meals/application/meal-editor-service.ts")>(
    "../lib/features/meals/application/meal-editor-service.ts"
  );

  await assert.rejects(
    () =>
      service.updateExistingMealRecord({
        mealId: "owned",
        selectedUsers: ["엄마"],
        description: "updated meal",
        type: "저녁",
        recordDate: new Date(TEST_NOW + 3_600_000),
        imageFile: {} as File,
        imagePreview: "blob:preview",
      }),
    /update failed/
  );

  assert.equal(updateMealCalls.length, 1);
  assert.deepEqual(cleanupCalls, ["https://example.com/uploaded.jpg"]);
  assert.equal(updateMealCalls[0]?.timestamp, TEST_NOW + 3_600_000);
});
