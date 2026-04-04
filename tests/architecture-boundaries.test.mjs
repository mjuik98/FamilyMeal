import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("lint config blocks direct server imports from UI layers and direct QA runtime imports from feature services", () => {
  const eslintConfig = read("eslint.config.mjs");

  assert.match(eslintConfig, /group:\s*\["@\/lib\/server\/\*", "@\/lib\/firebase-admin"\]/);
  assert.match(eslintConfig, /UI layers must not import server-only modules directly/);
  assert.match(eslintConfig, /group:\s*\["@\/lib\/qa\/runtime"\]/);
  assert.match(eslintConfig, /Feature services must depend on runtime adapters instead of lib\/qa\/runtime directly/);
});

test("module-scoped contracts exist and meal mutations depend on contracts instead of broad Meal-shaped inputs", () => {
  const mealContractsPath = path.join(process.cwd(), "lib", "modules", "meals", "contracts.ts");
  const commentContractsPath = path.join(process.cwd(), "lib", "modules", "comments", "contracts.ts");
  const profileContractsPath = path.join(process.cwd(), "lib", "modules", "profile", "contracts.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");

  assert.equal(fs.existsSync(mealContractsPath), true);
  assert.equal(fs.existsSync(commentContractsPath), true);
  assert.equal(fs.existsSync(profileContractsPath), true);
  assert.match(mealMutations, /from "@\/lib\/modules\/meals\/contracts"/);
  assert.doesNotMatch(mealMutations, /Partial<Omit<Meal, "id" \| "imageUrl">>/);
});

test("feature services delegate runtime selection to infrastructure adapters", () => {
  const mealReadService = read("lib/features/meals/application/meal-read-service.ts");
  const mealEditorService = read("lib/features/meals/application/meal-editor-service.ts");
  const commentService = read("lib/features/comments/application/meal-comment-service.ts");
  const reactionService = read("lib/features/reactions/application/meal-reaction-service.ts");
  const userSessionService = read("lib/features/profile/application/user-session-service.ts");

  assert.match(mealReadService, /from "@\/lib\/modules\/meals\/infrastructure\/meal-read-runtime"/);
  assert.doesNotMatch(mealReadService, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(mealReadService, /from "@\/lib\/client\/meals"/);

  assert.match(mealEditorService, /from "@\/lib\/modules\/meals\/infrastructure\/meal-editor-runtime"/);
  assert.doesNotMatch(mealEditorService, /from "@\/lib\/qa\/runtime"/);

  assert.match(commentService, /from "@\/lib\/modules\/comments\/infrastructure\/comment-runtime"/);
  assert.doesNotMatch(commentService, /from "@\/lib\/qa\/runtime"/);

  assert.match(reactionService, /from "@\/lib\/modules\/reactions\/infrastructure\/reaction-runtime"/);
  assert.doesNotMatch(reactionService, /from "@\/lib\/qa\/runtime"/);

  assert.match(userSessionService, /from "@\/lib\/modules\/profile\/infrastructure\/user-session-runtime"/);
  assert.doesNotMatch(userSessionService, /from "@\/lib\/qa\/runtime"/);
});
