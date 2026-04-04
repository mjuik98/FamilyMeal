import assert from "node:assert/strict";
import test from "node:test";

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

test("hasMealParticipants returns false for an empty selection", async () => {
  const mealForm = await importFresh<typeof import("../lib/meal-form.ts")>("../lib/meal-form.ts");
  assert.equal(mealForm.hasMealParticipants([]), false);
});

test("hasMealParticipants returns true when at least one participant is selected", async () => {
  const mealForm = await importFresh<typeof import("../lib/meal-form.ts")>("../lib/meal-form.ts");
  assert.equal(mealForm.hasMealParticipants(["엄마"]), true);
});
