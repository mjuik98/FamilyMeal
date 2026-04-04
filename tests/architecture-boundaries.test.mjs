import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("lint config blocks direct server imports from UI layers and direct QA internals imports from feature and module layers", () => {
  const eslintConfig = read("eslint.config.mjs");

  assert.match(eslintConfig, /group:\s*\["@\/lib\/server\/\*", "@\/lib\/firebase-admin"\]/);
  assert.match(eslintConfig, /UI layers must not import server-only modules directly/);
  assert.match(eslintConfig, /group:\s*\["@\/lib\/client\/\*"\]/);
  assert.match(eslintConfig, /UI layers must not import client data modules directly/);
  assert.match(eslintConfig, /group:\s*\["@\/lib\/qa\/runtime"\]/);
  assert.match(eslintConfig, /Feature services must depend on runtime adapters instead of lib\/qa\/runtime directly/);
  assert.match(eslintConfig, /@\/lib\/qa\/fixtures/);
  assert.match(eslintConfig, /@\/lib\/qa\/mode/);
  assert.match(eslintConfig, /Module runtime adapters must depend on feature-specific qa adapters and focused client adapters instead of qa internals or compat barrels directly/);
});

test("module-scoped contracts exist only where shared runtime contracts are needed", () => {
  const mealContractsPath = path.join(process.cwd(), "lib", "modules", "meals", "contracts.ts");
  const commentContractsPath = path.join(process.cwd(), "lib", "modules", "comments", "contracts.ts");
  const profileContractsPath = path.join(process.cwd(), "lib", "modules", "profile", "contracts.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");
  const userSessionService = read("lib/features/profile/application/user-session-service.ts");

  assert.equal(fs.existsSync(mealContractsPath), true);
  assert.equal(fs.existsSync(commentContractsPath), true);
  assert.equal(fs.existsSync(profileContractsPath), false);
  assert.match(mealMutations, /from "@\/lib\/modules\/meals\/contracts"/);
  assert.doesNotMatch(mealMutations, /Partial<Omit<Meal, "id" \| "imageUrl">>/);
  assert.doesNotMatch(userSessionService, /modules\/profile\/contracts/);
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

test("UI layers do not import lib/client modules directly", () => {
  const mealCard = read("components/MealCard.tsx");
  const mealPreviewCard = read("components/MealPreviewCard.tsx");
  const profilePage = read("app/profile/page.tsx");

  assert.doesNotMatch(mealCard, /from "@\/lib\/client\//);
  assert.doesNotMatch(mealPreviewCard, /from "@\/lib\/client\//);
  assert.doesNotMatch(profilePage, /from "@\/lib\/client\//);
});

test("module runtimes depend on feature-scoped QA adapters instead of shared QA internals", () => {
  const mealsQaAdapterPath = path.join(process.cwd(), "lib", "qa", "adapters", "meals.ts");
  const commentsQaAdapterPath = path.join(process.cwd(), "lib", "qa", "adapters", "comments.ts");
  const reactionsQaAdapterPath = path.join(process.cwd(), "lib", "qa", "adapters", "reactions.ts");
  const profileQaAdapterPath = path.join(process.cwd(), "lib", "qa", "adapters", "profile.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");
  const mealEditorRuntime = read("lib/modules/meals/infrastructure/meal-editor-runtime.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");
  const reactionRuntime = read("lib/modules/reactions/infrastructure/reaction-runtime.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");

  assert.equal(fs.existsSync(mealsQaAdapterPath), true);
  assert.equal(fs.existsSync(commentsQaAdapterPath), true);
  assert.equal(fs.existsSync(reactionsQaAdapterPath), true);
  assert.equal(fs.existsSync(profileQaAdapterPath), true);

  assert.match(mealReadRuntime, /from "@\/lib\/qa\/adapters\/meals"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/qa\/adapters\/meals"/);
  assert.match(commentRuntime, /from "@\/lib\/qa\/adapters\/comments"/);
  assert.match(reactionRuntime, /from "@\/lib\/qa\/adapters\/reactions"/);
  assert.match(userSessionRuntime, /from "@\/lib\/qa\/adapters\/profile"/);
  assert.match(mealReadRuntime, /from "@\/lib\/client\/meal-queries"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/client\/meal-mutations"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/client\/meal-queries"/);

  assert.doesNotMatch(mealReadRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(mealEditorRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(commentRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(reactionRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(userSessionRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(mealReadRuntime, /from "@\/lib\/client\/meals"/);
  assert.doesNotMatch(mealEditorRuntime, /from "@\/lib\/client\/meals"/);
});
