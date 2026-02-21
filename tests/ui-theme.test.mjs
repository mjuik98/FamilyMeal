import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("global styles are locked to light color scheme", () => {
  const globals = read("app/globals.css");
  assert.match(globals, /color-scheme:\s*light;/);
  assert.doesNotMatch(globals, /prefers-color-scheme:\s*dark/);
});

test("viewport metadata uses fixed light theme color", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /colorScheme:\s*"light"/);
  assert.match(layout, /themeColor:\s*"#FAFAF5"/);
  assert.doesNotMatch(layout, /prefers-color-scheme/);
});

test("comment and form inputs use shared input classes", () => {
  const mealCard = read("components/MealCard.tsx");
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");

  assert.match(mealCard, /className="input-base input-pill comment-input"/);
  assert.match(mealCard, /data-testid="meal-card-comment-toggle"/);
  assert.match(mealCard, /data-testid="meal-card-comment-input"/);
  assert.match(read("app/page.tsx"), /data-testid="home-logout-button"/);
  assert.match(addPage, /className="input-base textarea-base"/);
  assert.match(editPage, /className="input-base textarea-base[^"]*"/);
});

test("update banner is wired into root layout", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /import AppUpdateBanner from "@\/components\/AppUpdateBanner"/);
  assert.match(layout, /<AppUpdateBanner \/>/);
});

test("unused app page module stylesheet is removed", () => {
  const stylesheetPath = path.join(process.cwd(), "app", "page.module.css");
  assert.equal(fs.existsSync(stylesheetPath), false);
});

test("qa route for meal card e2e exists", () => {
  const qaPagePath = path.join(process.cwd(), "app", "qa", "meal-card", "page.tsx");
  assert.equal(fs.existsSync(qaPagePath), true);
});

test("qa route is gated in production", () => {
  const qaPage = read("app/qa/meal-card/page.tsx");
  assert.match(qaPage, /process\.env\.NODE_ENV !== "production"/);
  assert.match(qaPage, /NEXT_PUBLIC_ENABLE_QA === "true"/);
  assert.match(qaPage, /notFound\(\)/);
});

test("qa proxy supports token-based protection", () => {
  const proxy = read("proxy.ts");
  assert.match(proxy, /QA_ROUTE_TOKEN/);
  assert.match(proxy, /qa_token/);
  assert.match(proxy, /x-qa-token/);
  assert.match(proxy, /matcher:\s*\["\/qa\/:path\*"\]/);
  assert.match(proxy, /canAccessQaRoute/);
});

test("qa mock mode is disabled in production by env guard", () => {
  const qaLib = read("lib/qa.ts");
  assert.match(qaLib, /NODE_ENV !== "production"/);
});

test("critical UI files are UTF-8 clean", () => {
  const criticalFiles = [
    "app/page.tsx",
    "components/LoginView.tsx",
    "components/MealCard.tsx",
    "context/UserContext.tsx",
  ];

  for (const file of criticalFiles) {
    assert.doesNotMatch(read(file), /\uFFFD/);
  }
});
