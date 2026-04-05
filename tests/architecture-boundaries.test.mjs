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

test("meal helper files are implemented inside the meals module and legacy root files stay as shims", () => {
  const moduleMealImagePolicyPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "domain",
    "meal-image-policy.ts"
  );
  const moduleMealFormPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "domain",
    "meal-form.ts"
  );
  const moduleMealCopyPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "domain",
    "meal-copy.ts"
  );
  const moduleMealDraftPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "domain",
    "meal-draft.ts"
  );
  const moduleMealErrorsPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "ui",
    "meal-error-messages.ts"
  );

  assert.equal(fs.existsSync(moduleMealImagePolicyPath), true);
  assert.equal(fs.existsSync(moduleMealFormPath), true);
  assert.equal(fs.existsSync(moduleMealCopyPath), true);
  assert.equal(fs.existsSync(moduleMealDraftPath), true);
  assert.equal(fs.existsSync(moduleMealErrorsPath), true);

  assert.match(read("lib/meal-image-policy.ts"), /from "@\/lib\/modules\/meals\/domain\/meal-image-policy"/);
  assert.match(read("lib/meal-form.ts"), /from "@\/lib\/modules\/meals\/domain\/meal-form"/);
  assert.match(read("lib/meal-copy.ts"), /from "@\/lib\/modules\/meals\/domain\/meal-copy"/);
  assert.match(read("lib/meal-draft.ts"), /from "@\/lib\/modules\/meals\/domain\/meal-draft"/);
  assert.match(read("lib/meal-errors.ts"), /from "@\/lib\/modules\/meals\/ui\/meal-error-messages"/);
});

test("add and edit pages delegate orchestration to meal page controllers", () => {
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");

  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/useAddMealPageController"/);
  assert.match(editPage, /from "@\/lib\/modules\/meals\/ui\/useEditMealPageController"/);

  assert.doesNotMatch(addPage, /from "@\/lib\/features\/meals\/application\/meal-editor-service"/);
  assert.doesNotMatch(addPage, /from "@\/lib\/meal-copy"/);
  assert.doesNotMatch(addPage, /from "@\/lib\/meal-draft"/);
  assert.doesNotMatch(addPage, /from "@\/lib\/meal-errors"/);
  assert.doesNotMatch(addPage, /from "@\/lib\/meal-form"/);
  assert.doesNotMatch(addPage, /from "@\/lib\/meal-image-policy"/);

  assert.doesNotMatch(editPage, /from "@\/lib\/features\/meals\/application\/meal-editor-service"/);
  assert.doesNotMatch(editPage, /from "@\/lib\/meal-errors"/);
  assert.doesNotMatch(editPage, /from "@\/lib\/meal-form"/);
  assert.doesNotMatch(editPage, /from "@\/lib\/meal-image-policy"/);
});

test("selected API routes use the shared route handler wrapper for error delivery", () => {
  const routeFiles = [
    "app/api/profile/session/route.ts",
    "app/api/profile/role/route.ts",
    "app/api/profile/settings/route.ts",
    "app/api/meals/[id]/comments/route.ts",
    "app/api/meals/[id]/comments/[commentId]/route.ts",
    "app/api/meals/[id]/reactions/route.ts",
    "app/api/meals/[id]/comments/[commentId]/reactions/route.ts",
    "app/api/archive/route.ts",
    "app/api/version/route.ts",
  ];

  routeFiles.forEach((relativePath) => {
    const routeFile = read(relativePath);
    assert.match(
      routeFile,
      /from "@\/lib\/platform\/http\/route-handler"/,
      `${relativePath} must import the shared route handler`
    );
    assert.doesNotMatch(
      routeFile,
      /getRouteErrorPayload/,
      `${relativePath} should not build error payloads inline`
    );
    assert.doesNotMatch(
      routeFile,
      /getRouteErrorStatus/,
      `${relativePath} should not map error status inline`
    );
  });
});

test("platform auth and http helpers own the real implementations while legacy entrypoints stay as shims", () => {
  const platformRouteErrorsPath = path.join(
    process.cwd(),
    "lib",
    "platform",
    "http",
    "route-errors.ts"
  );
  const platformAuthHttpPath = path.join(
    process.cwd(),
    "lib",
    "platform",
    "http",
    "auth-http.ts"
  );
  const platformServerAuthPath = path.join(
    process.cwd(),
    "lib",
    "platform",
    "auth",
    "server-auth.ts"
  );
  const platformRouteAuthPath = path.join(
    process.cwd(),
    "lib",
    "platform",
    "auth",
    "route-auth.ts"
  );

  assert.equal(fs.existsSync(platformRouteErrorsPath), true);
  assert.equal(fs.existsSync(platformAuthHttpPath), true);
  assert.equal(fs.existsSync(platformServerAuthPath), true);
  assert.equal(fs.existsSync(platformRouteAuthPath), true);

  assert.match(read("lib/route-errors.ts"), /from "@\/lib\/platform\/http\/route-errors"/);
  assert.match(read("lib/client/auth-http.ts"), /from "@\/lib\/platform\/http\/auth-http"/);
  assert.match(read("lib/server-auth.ts"), /from "@\/lib\/platform\/auth\/server-auth"/);
  assert.match(read("lib/server/route-auth.ts"), /from "@\/lib\/platform\/auth\/route-auth"/);
});

test("meals server implementations live inside the meals module and legacy server files stay as shims", () => {
  const moduleServerPaths = [
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-types.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-read-use-cases.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-write-use-cases.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-delete-use-cases.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "archive-types.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "archive-use-cases.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-image-url.ts"),
    path.join(process.cwd(), "lib", "modules", "meals", "server", "meal-storage.ts"),
  ];
  const legacyShimAssertions = [
    ["lib/server/meals/meal-types.ts", /from "@\/lib\/modules\/meals\/server\/meal-types"/],
    ["lib/server/meals/meal-read-use-cases.ts", /from "@\/lib\/modules\/meals\/server\/meal-read-use-cases"/],
    ["lib/server/meals/meal-write-use-cases.ts", /from "@\/lib\/modules\/meals\/server\/meal-write-use-cases"/],
    ["lib/server/meals/meal-delete-use-cases.ts", /from "@\/lib\/modules\/meals\/server\/meal-delete-use-cases"/],
    ["lib/server/meals/archive-types.ts", /from "@\/lib\/modules\/meals\/server\/archive-types"/],
    ["lib/server/meals/archive-use-cases.ts", /from "@\/lib\/modules\/meals\/server\/archive-use-cases"/],
    ["lib/server/meals/meal-image-url.ts", /from "@\/lib\/modules\/meals\/server\/meal-image-url"/],
    ["lib/server/meals/meal-storage.ts", /from "@\/lib\/modules\/meals\/server\/meal-storage"/],
  ];
  const routeAssertions = [
    "app/api/meals/route.ts",
    "app/api/meals/[id]/route.ts",
    "app/api/meals/weekly-stats/route.ts",
    "app/api/archive/route.ts",
    "app/api/uploads/meal-image/route.ts",
  ];

  moduleServerPaths.forEach((modulePath) => assert.equal(fs.existsSync(modulePath), true));
  legacyShimAssertions.forEach(([relativePath, pattern]) => {
    assert.match(read(relativePath), pattern);
  });
  routeAssertions.forEach((relativePath) => {
    const source = read(relativePath);
    assert.match(source, /from "@\/lib\/modules\/meals\/server\//);
    assert.doesNotMatch(source, /from "@\/lib\/server\/meals\//);
  });
});

test("server and client layers import platform auth and http helpers directly", () => {
  const routeHandler = read("lib/platform/http/route-handler.ts");
  const clientMeals = read("lib/client/meal-queries.ts");
  const clientMutations = read("lib/client/meal-mutations.ts");
  const clientComments = read("lib/client/comments.ts");
  const clientReactions = read("lib/client/reactions.ts");
  const clientActivity = read("lib/client/activity.ts");
  const clientProfileSession = read("lib/client/profile-session.ts");
  const uploadHelper = read("lib/uploadImage.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const uploadUseCases = read("lib/server/uploads/meal-image-use-cases.ts");
  const archiveRoute = read("app/api/archive/route.ts");
  const mealsRoute = read("app/api/meals/route.ts");
  const mealDetailRoute = read("app/api/meals/[id]/route.ts");
  const weeklyStatsRoute = read("app/api/meals/weekly-stats/route.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const profileSessionRoute = read("app/api/profile/session/route.ts");
  const profileRoleRoute = read("app/api/profile/role/route.ts");
  const profileSettingsRoute = read("app/api/profile/settings/route.ts");
  const commentsRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentMutationRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const mealReactionsRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionsRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const clientErrorsRoute = read("app/api/client-errors/route.ts");

  assert.match(routeHandler, /from "@\/lib\/platform\/http\/route-errors"/);

  for (const source of [
    clientMeals,
    clientMutations,
    clientComments,
    clientReactions,
    clientActivity,
    clientProfileSession,
    uploadHelper,
  ]) {
    assert.match(source, /@\/lib\/platform\/http\/auth-http/);
    assert.doesNotMatch(source, /@\/lib\/client\/auth-http/);
  }

  for (const source of [commentUseCases, reactionUseCases, profileUseCases, uploadUseCases]) {
    assert.match(source, /@\/lib\/platform\/http\/route-errors/);
    assert.doesNotMatch(source, /@\/lib\/route-errors/);
  }

  for (const source of [
    archiveRoute,
    mealsRoute,
    mealDetailRoute,
    weeklyStatsRoute,
    uploadRoute,
    profileSessionRoute,
    profileRoleRoute,
    profileSettingsRoute,
    commentsRoute,
    commentMutationRoute,
    mealReactionsRoute,
    commentReactionsRoute,
  ]) {
    assert.match(source, /@\/lib\/platform\/auth\/route-auth/);
    assert.doesNotMatch(source, /@\/lib\/server\/route-auth/);
  }

  assert.match(clientErrorsRoute, /@\/lib\/platform\/http\/route-errors/);
  assert.doesNotMatch(clientErrorsRoute, /@\/lib\/route-errors/);
  assert.match(mealDetailRoute, /@\/lib\/platform\/auth\/server-auth/);
  assert.doesNotMatch(mealDetailRoute, /@\/lib\/server-auth/);
});

test("comment reaction and profile server implementations live under feature modules while legacy server paths stay as shims", () => {
  const moduleCommentTypesPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "server",
    "comment-types.ts"
  );
  const moduleCommentPolicyPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "server",
    "comment-policy.ts"
  );
  const moduleCommentUseCasesPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "server",
    "comment-use-cases.ts"
  );
  const moduleReactionPolicyPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "reactions",
    "server",
    "reaction-policy.ts"
  );
  const moduleReactionUseCasesPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "reactions",
    "server",
    "reaction-use-cases.ts"
  );
  const moduleProfileUseCasesPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "server",
    "profile-use-cases.ts"
  );

  assert.equal(fs.existsSync(moduleCommentTypesPath), true);
  assert.equal(fs.existsSync(moduleCommentPolicyPath), true);
  assert.equal(fs.existsSync(moduleCommentUseCasesPath), true);
  assert.equal(fs.existsSync(moduleReactionPolicyPath), true);
  assert.equal(fs.existsSync(moduleReactionUseCasesPath), true);
  assert.equal(fs.existsSync(moduleProfileUseCasesPath), true);

  assert.match(read("lib/server/comments/comment-types.ts"), /modules\/comments\/server\/comment-types/);
  assert.match(read("lib/server/comments/comment-policy.ts"), /modules\/comments\/server\/comment-policy/);
  assert.match(read("lib/server/comments/comment-use-cases.ts"), /modules\/comments\/server\/comment-use-cases/);
  assert.match(read("lib/server/reactions/reaction-policy.ts"), /modules\/reactions\/server\/reaction-policy/);
  assert.match(read("lib/server/reactions/reaction-use-cases.ts"), /modules\/reactions\/server\/reaction-use-cases/);
  assert.match(read("lib/server/profile/profile-use-cases.ts"), /modules\/profile\/server\/profile-use-cases/);
});

test("comment reaction and profile routes import module-local server implementations directly", () => {
  const commentsRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentMutationRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const mealReactionsRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionsRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const profileSessionRoute = read("app/api/profile/session/route.ts");
  const profileRoleRoute = read("app/api/profile/role/route.ts");
  const profileSettingsRoute = read("app/api/profile/settings/route.ts");

  assert.match(commentsRoute, /@\/lib\/modules\/comments\/server\/comment-policy/);
  assert.match(commentsRoute, /@\/lib\/modules\/comments\/server\/comment-use-cases/);
  assert.match(commentMutationRoute, /@\/lib\/modules\/comments\/server\/comment-policy/);
  assert.match(commentMutationRoute, /@\/lib\/modules\/comments\/server\/comment-use-cases/);
  assert.match(mealReactionsRoute, /@\/lib\/modules\/reactions\/server\/reaction-policy/);
  assert.match(mealReactionsRoute, /@\/lib\/modules\/reactions\/server\/reaction-use-cases/);
  assert.match(commentReactionsRoute, /@\/lib\/modules\/reactions\/server\/reaction-policy/);
  assert.match(commentReactionsRoute, /@\/lib\/modules\/reactions\/server\/reaction-use-cases/);
  assert.match(profileSessionRoute, /@\/lib\/modules\/profile\/server\/profile-use-cases/);
  assert.match(profileRoleRoute, /@\/lib\/modules\/profile\/server\/profile-use-cases/);
  assert.match(profileSettingsRoute, /@\/lib\/modules\/profile\/server\/profile-use-cases/);

  assert.doesNotMatch(commentsRoute, /@\/lib\/server\/comments\//);
  assert.doesNotMatch(commentMutationRoute, /@\/lib\/server\/comments\//);
  assert.doesNotMatch(mealReactionsRoute, /@\/lib\/server\/reactions\//);
  assert.doesNotMatch(commentReactionsRoute, /@\/lib\/server\/reactions\//);
  assert.doesNotMatch(profileSessionRoute, /@\/lib\/server\/profile\//);
  assert.doesNotMatch(profileRoleRoute, /@\/lib\/server\/profile\//);
  assert.doesNotMatch(profileSettingsRoute, /@\/lib\/server\/profile\//);
});
