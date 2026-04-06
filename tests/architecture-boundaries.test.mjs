import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const exists = (relativePath) => fs.existsSync(path.join(process.cwd(), relativePath));

test("lint config blocks direct server imports from UI layers and direct QA internals imports from feature and module layers", () => {
  const eslintConfig = read("eslint.config.mjs");

  assert.match(eslintConfig, /Legacy server shims were removed\. Import module-local server files or platform auth helpers directly\./);
  assert.match(eslintConfig, /UI layers must not import firebase-admin directly/);
  assert.match(eslintConfig, /group:\s*\["@\/lib\/client\/\*"\]/);
  assert.match(eslintConfig, /UI layers must not import client data modules directly/);
  assert.match(eslintConfig, /Legacy feature shims were removed\. Import module-local application and ui entrypoints directly\./);
  assert.match(eslintConfig, /@\/lib\/qa\/fixtures/);
  assert.match(eslintConfig, /@\/lib\/qa\/mode/);
  assert.match(eslintConfig, /Module runtime adapters must depend on feature-specific QA adapters and focused client helpers instead of QA internals or removed compat barrels directly/);
  assert.match(eslintConfig, /Comment server code must depend on module-local Firestore adapters instead of firebase-admin directly/);
  assert.match(eslintConfig, /Reaction server code must depend on module-local Firestore adapters instead of firebase-admin directly/);
  assert.match(eslintConfig, /Activity server code must depend on module-local Firestore adapters instead of firebase-admin directly/);
});

test("package metadata declares the OpenTelemetry API required by clean-install Firebase server imports", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(
    packageJson.dependencies?.["@opentelemetry/api"],
    "^1.9.0"
  );
});

test("module-scoped contracts exist only where shared runtime contracts are needed", () => {
  const mealContractsPath = path.join(process.cwd(), "lib", "modules", "meals", "contracts.ts");
  const commentContractsPath = path.join(process.cwd(), "lib", "modules", "comments", "contracts.ts");
  const profileContractsPath = path.join(process.cwd(), "lib", "modules", "profile", "contracts.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");

  assert.equal(fs.existsSync(mealContractsPath), true);
  assert.equal(fs.existsSync(commentContractsPath), true);
  assert.equal(fs.existsSync(profileContractsPath), false);
  assert.match(mealMutations, /from "@\/lib\/modules\/meals\/contracts"/);
  assert.doesNotMatch(mealMutations, /Partial<Omit<Meal, "id" \| "imageUrl">>/);
  assert.doesNotMatch(userSessionService, /modules\/profile\/contracts/);
});

test("module application services own runtime delegation and the legacy feature layer is removed", () => {
  const mealReadService = read("lib/modules/meals/application/meal-read-service.ts");
  const mealEditorService = read("lib/modules/meals/application/meal-editor-service.ts");
  const commentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const reactionService = read("lib/modules/reactions/application/meal-reaction-service.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");

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
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "features")), false);
});

test("active callers import module-local application and ui entrypoints instead of feature shims", () => {
  const homePage = read("app/page.tsx");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const mealCard = read("components/MealCard.tsx");
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const conversationPanel = read("components/meal-detail/MealConversationPanel.tsx");
  const userContext = read("context/UserContext.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");

  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useHomePageController"/);
  assert.match(archivePage, /from "@\/lib\/modules\/meals\/ui\/useArchivePageController"/);
  assert.match(mealDetailPage, /from "@\/lib\/modules\/meals\/ui\/useMealDetailPageController"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/ui\/useMealsForDateController"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/ui\/useWeeklyStatsController"/);
  assert.match(archiveController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealDetailController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealCard, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.match(mealCard, /from "@\/lib\/modules\/comments\/ui\/useMealCommentsController"/);
  assert.match(mealCard, /from "@\/lib\/modules\/reactions\/ui\/useMealReactionsController"/);
  assert.match(commentComposer, /from "@\/lib\/modules\/comments\/ui\/types"/);
  assert.match(conversationPanel, /from "@\/lib\/modules\/comments\/ui\/types"/);
  assert.match(userContext, /from "@\/lib\/modules\/profile\/application\/user-session-service"/);
  assert.match(addController, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.match(addController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(editController, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);

  assert.doesNotMatch(homePage, /from "@\/lib\/features\//);
  assert.doesNotMatch(archivePage, /from "@\/lib\/features\//);
  assert.doesNotMatch(mealDetailPage, /from "@\/lib\/features\//);
  assert.doesNotMatch(homeController, /from "@\/lib\/features\//);
  assert.doesNotMatch(archiveController, /from "@\/lib\/features\//);
  assert.doesNotMatch(mealDetailController, /from "@\/lib\/features\//);
  assert.doesNotMatch(mealCard, /from "@\/lib\/features\//);
  assert.doesNotMatch(commentComposer, /from "@\/lib\/features\//);
  assert.doesNotMatch(conversationPanel, /from "@\/lib\/features\//);
  assert.doesNotMatch(userContext, /from "@\/lib\/features\//);
  assert.doesNotMatch(addController, /from "@\/lib\/features\//);
  assert.doesNotMatch(editController, /from "@\/lib\/features\//);
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

test("meal helper files are implemented inside the meals module and legacy root files are removed", () => {
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

  assert.equal(exists("lib/meal-image-policy.ts"), false);
  assert.equal(exists("lib/meal-form.ts"), false);
  assert.equal(exists("lib/meal-copy.ts"), false);
  assert.equal(exists("lib/meal-draft.ts"), false);
  assert.equal(exists("lib/meal-errors.ts"), false);
});

test("meal upload and comment data adapters live inside feature modules and removed server shims stay absent", () => {
  const mealImageUploadPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "adapters",
    "storage",
    "meal-image-upload.ts"
  );
  const commentClientPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "adapters",
    "firestore",
    "comment-client.ts"
  );
  const commentStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "adapters",
    "firestore",
    "comment-subscription-store.ts"
  );
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");

  assert.equal(fs.existsSync(mealImageUploadPath), true);
  assert.equal(fs.existsSync(commentClientPath), true);
  assert.equal(fs.existsSync(commentStorePath), true);
  assert.equal(
    fs.existsSync(path.join(process.cwd(), "lib", "server", "uploads", "meal-image-use-cases.ts")),
    false
  );
  assert.equal(exists("lib/client/comments.ts"), false);
  assert.equal(exists("lib/meal-comments-store.ts"), false);

  assert.match(uploadRoute, /from "@\/lib\/modules\/meals\/adapters\/storage\/meal-image-upload"/);
  assert.doesNotMatch(uploadRoute, /from "@\/lib\/server\/uploads\/meal-image-use-cases"/);

  assert.match(commentRuntime, /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-client"/);
  assert.match(
    commentRuntime,
    /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-subscription-store"/
  );
  assert.doesNotMatch(commentRuntime, /from "@\/lib\/client\/comments"/);
  assert.doesNotMatch(commentRuntime, /from "@\/lib\/meal-comments-store"/);
});

test("meals server code depends on module-local adapters instead of firebase-admin directly", () => {
  const eslintConfig = read("eslint.config.mjs");
  const mealReadUseCases = read("lib/modules/meals/server/meal-read-use-cases.ts");
  const mealWriteUseCases = read("lib/modules/meals/server/meal-write-use-cases.ts");
  const archiveUseCases = read("lib/modules/meals/server/archive-use-cases.ts");
  const mealDeleteUseCases = read("lib/modules/meals/server/meal-delete-use-cases.ts");
  const mealStorage = read("lib/modules/meals/server/meal-storage.ts");

  const mealAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "adapters",
    "firestore",
    "meal-admin-store.ts"
  );
  const mealArchiveStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "adapters",
    "firestore",
    "meal-archive-store.ts"
  );
  const mealDeleteStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "adapters",
    "firestore",
    "meal-delete-store.ts"
  );
  const mealStorageAdminPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "meals",
    "adapters",
    "storage",
    "meal-storage-admin.ts"
  );

  assert.match(
    eslintConfig,
    /Meals server code must depend on module-local Firestore or storage adapters instead of firebase-admin directly\./
  );
  assert.equal(fs.existsSync(mealAdminStorePath), true);
  assert.equal(fs.existsSync(mealArchiveStorePath), true);
  assert.equal(fs.existsSync(mealDeleteStorePath), true);
  assert.equal(fs.existsSync(mealStorageAdminPath), true);

  assert.match(mealReadUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-admin-store"/);
  assert.match(mealWriteUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-admin-store"/);
  assert.match(archiveUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-archive-store"/);
  assert.match(mealDeleteUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-delete-store"/);
  assert.match(mealStorage, /from "@\/lib\/modules\/meals\/adapters\/storage\/meal-storage-admin"/);

  assert.doesNotMatch(mealReadUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealWriteUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(archiveUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealDeleteUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealStorage, /from "@\/lib\/firebase-admin"/);
});

test("activity logging and notification helpers live in module-local paths and legacy compat entrypoints are removed", () => {
  const moduleActivityLogPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "activity",
    "server",
    "activity-log.ts"
  );
  const moduleActivityAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "activity",
    "adapters",
    "firestore",
    "activity-admin-store.ts"
  );
  const moduleNotificationDomainPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "domain",
    "notification-preferences.ts"
  );
  const moduleNotificationClientPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "adapters",
    "http",
    "profile-notification-client.ts"
  );

  const moduleActivityLog = read("lib/modules/activity/server/activity-log.ts");
  const moduleActivityAdminStore = read("lib/modules/activity/adapters/firestore/activity-admin-store.ts");
  const profilePage = read("app/profile/page.tsx");
  const profileSession = read("lib/client/profile-session.ts");
  const qaSession = read("lib/qa/session.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentAdminStore = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");
  const reactionAdminStore = read("lib/modules/reactions/adapters/firestore/reaction-admin-store.ts");

  assert.equal(fs.existsSync(moduleActivityLogPath), true);
  assert.equal(fs.existsSync(moduleActivityAdminStorePath), true);
  assert.equal(fs.existsSync(moduleNotificationDomainPath), true);
  assert.equal(fs.existsSync(moduleNotificationClientPath), true);

  assert.match(moduleActivityLog, /from "@\/lib\/modules\/activity\/adapters\/firestore\/activity-admin-store"/);
  assert.match(moduleActivityAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.equal(exists("lib/activity-log.ts"), false);
  assert.equal(exists("lib/activity.ts"), false);
  assert.equal(exists("lib/client/activity.ts"), false);

  assert.match(profilePage, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(profileSession, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(qaSession, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(profileUseCases, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(
    userSessionRuntime,
    /from "@\/lib\/modules\/profile\/adapters\/http\/profile-notification-client"/
  );
  assert.match(commentUseCases, /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-admin-store"/);
  assert.match(commentAdminStore, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.match(reactionUseCases, /from "@\/lib\/modules\/reactions\/adapters\/firestore\/reaction-admin-store"/);
  assert.match(reactionAdminStore, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.doesNotMatch(moduleActivityLog, /from "@\/lib\/firebase-admin"/);

  assert.doesNotMatch(profilePage, /from "@\/lib\/activity"/);
  assert.doesNotMatch(profileSession, /from "@\/lib\/activity"/);
  assert.doesNotMatch(qaSession, /from "@\/lib\/activity"/);
  assert.doesNotMatch(profileUseCases, /from "@\/lib\/activity"/);
  assert.doesNotMatch(userSessionRuntime, /from "@\/lib\/client\/activity"/);
  assert.doesNotMatch(commentUseCases, /from "@\/lib\/activity-log"/);
  assert.doesNotMatch(reactionUseCases, /from "@\/lib\/activity-log"/);
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
    "app/api/client-errors/route.ts",
    "app/api/meals/route.ts",
    "app/api/meals/[id]/route.ts",
    "app/api/meals/weekly-stats/route.ts",
    "app/api/profile/session/route.ts",
    "app/api/profile/role/route.ts",
    "app/api/profile/settings/route.ts",
    "app/api/meals/[id]/comments/route.ts",
    "app/api/meals/[id]/comments/[commentId]/route.ts",
    "app/api/meals/[id]/reactions/route.ts",
    "app/api/meals/[id]/comments/[commentId]/reactions/route.ts",
    "app/api/archive/route.ts",
    "app/api/version/route.ts",
    "app/api/uploads/meal-image/route.ts",
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

test("platform auth and http helpers own the real implementations and removed server compat entrypoints stay absent", () => {
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
  const profileAuthContextPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "server",
    "profile-auth-context.ts"
  );

  assert.equal(fs.existsSync(platformRouteErrorsPath), true);
  assert.equal(fs.existsSync(platformAuthHttpPath), true);
  assert.equal(fs.existsSync(platformServerAuthPath), true);
  assert.equal(fs.existsSync(platformRouteAuthPath), true);
  assert.equal(fs.existsSync(profileAuthContextPath), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "route-auth.ts")), false);

  assert.equal(exists("lib/route-errors.ts"), false);
  assert.equal(exists("lib/client/auth-http.ts"), false);
  assert.equal(exists("lib/server-auth.ts"), false);
});

test("meals server implementations live inside the meals module and legacy server files are removed", () => {
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
  const removedLegacyPaths = [
    path.join(process.cwd(), "lib", "server", "meals", "meal-types.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "meal-read-use-cases.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "meal-write-use-cases.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "meal-delete-use-cases.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "archive-types.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "archive-use-cases.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "meal-image-url.ts"),
    path.join(process.cwd(), "lib", "server", "meals", "meal-storage.ts"),
  ];
  const routeAssertions = [
    "app/api/meals/route.ts",
    "app/api/meals/[id]/route.ts",
    "app/api/meals/weekly-stats/route.ts",
    "app/api/archive/route.ts",
    "app/api/uploads/meal-image/route.ts",
  ];

  moduleServerPaths.forEach((modulePath) => assert.equal(fs.existsSync(modulePath), true));
  removedLegacyPaths.forEach((legacyPath) => {
    assert.equal(fs.existsSync(legacyPath), false);
  });
  routeAssertions.forEach((relativePath) => {
    const source = read(relativePath);
    assert.match(source, /from "@\/lib\/modules\/meals\/server\//);
    assert.doesNotMatch(source, /from "@\/lib\/server\/meals\//);
  });
});

test("server and client layers import platform auth and http helpers directly", () => {
  const routeHandler = read("lib/platform/http/route-handler.ts");
  const platformRouteAuth = read("lib/platform/auth/route-auth.ts");
  const platformServerAuth = read("lib/platform/auth/server-auth.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");
  const profileAdminAuth = read("lib/modules/profile/adapters/firebase/profile-admin-auth.ts");
  const profileAdminStore = read("lib/modules/profile/adapters/firebase/profile-admin-store.ts");
  const activityLog = read("lib/modules/activity/server/activity-log.ts");
  const activityAdminStore = read("lib/modules/activity/adapters/firestore/activity-admin-store.ts");
  const clientMeals = read("lib/client/meal-queries.ts");
  const clientMutations = read("lib/client/meal-mutations.ts");
  const commentClient = read("lib/modules/comments/adapters/firestore/comment-client.ts");
  const clientReactions = read("lib/client/reactions.ts");
  const moduleNotificationClient = read(
    "lib/modules/profile/adapters/http/profile-notification-client.ts"
  );
  const clientProfileSession = read("lib/client/profile-session.ts");
  const uploadHelper = read("lib/uploadImage.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentAdminStore = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");
  const reactionAdminStore = read("lib/modules/reactions/adapters/firestore/reaction-admin-store.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const uploadAdapter = read("lib/modules/meals/adapters/storage/meal-image-upload.ts");
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
  assert.match(platformRouteAuth, /modules\/profile\/server\/profile-auth-context/);
  assert.doesNotMatch(platformServerAuth, /adminDb/);
  assert.match(profileAuthContext, /from "@\/lib\/modules\/profile\/adapters\/firebase\/profile-admin-store"/);
  assert.doesNotMatch(profileAuthContext, /from "@\/lib\/firebase-admin"/);
  assert.match(profileAdminAuth, /from "@\/lib\/firebase-admin"/);
  assert.match(profileAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(activityLog, /from "@\/lib\/modules\/activity\/adapters\/firestore\/activity-admin-store"/);
  assert.doesNotMatch(activityLog, /from "@\/lib\/firebase-admin"/);
  assert.match(commentUseCases, /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-admin-store"/);
  assert.doesNotMatch(commentUseCases, /from "@\/lib\/firebase-admin"/);
  assert.match(commentAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(reactionUseCases, /from "@\/lib\/modules\/reactions\/adapters\/firestore\/reaction-admin-store"/);
  assert.doesNotMatch(reactionUseCases, /from "@\/lib\/firebase-admin"/);
  assert.match(reactionAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(activityAdminStore, /from "@\/lib\/firebase-admin"/);

  for (const source of [
    clientMeals,
    clientMutations,
    commentClient,
    clientReactions,
    moduleNotificationClient,
    clientProfileSession,
    uploadHelper,
  ]) {
    assert.match(source, /@\/lib\/platform\/http\/auth-http/);
    assert.doesNotMatch(source, /@\/lib\/client\/auth-http/);
  }

  assert.equal(exists("lib/client/activity.ts"), false);

  for (const source of [commentUseCases, reactionUseCases, profileUseCases, uploadAdapter]) {
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

  assert.match(clientErrorsRoute, /@\/lib\/platform\/http\/client-error-ingest/);
  assert.match(clientErrorsRoute, /@\/lib\/platform\/http\/route-handler/);
  assert.doesNotMatch(clientErrorsRoute, /@\/lib\/platform\/http\/route-errors/);
  assert.doesNotMatch(clientErrorsRoute, /@\/lib\/route-errors/);
  assert.match(mealDetailRoute, /@\/lib\/platform\/auth\/server-auth/);
  assert.doesNotMatch(mealDetailRoute, /@\/lib\/server-auth/);
});

test("comment reaction and profile server implementations live under feature modules and legacy server paths are removed", () => {
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
  const moduleCommentAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "comments",
    "adapters",
    "firestore",
    "comment-admin-store.ts"
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
  const moduleReactionAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "reactions",
    "adapters",
    "firestore",
    "reaction-admin-store.ts"
  );
  const moduleActivityAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "activity",
    "adapters",
    "firestore",
    "activity-admin-store.ts"
  );
  const moduleProfileUseCasesPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "server",
    "profile-use-cases.ts"
  );
  const moduleProfileAdminAuthPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "adapters",
    "firebase",
    "profile-admin-auth.ts"
  );
  const moduleProfileAdminStorePath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "profile",
    "adapters",
    "firebase",
    "profile-admin-store.ts"
  );

  assert.equal(fs.existsSync(moduleCommentTypesPath), true);
  assert.equal(fs.existsSync(moduleCommentPolicyPath), true);
  assert.equal(fs.existsSync(moduleCommentUseCasesPath), true);
  assert.equal(fs.existsSync(moduleCommentAdminStorePath), true);
  assert.equal(fs.existsSync(moduleReactionPolicyPath), true);
  assert.equal(fs.existsSync(moduleReactionUseCasesPath), true);
  assert.equal(fs.existsSync(moduleReactionAdminStorePath), true);
  assert.equal(fs.existsSync(moduleActivityAdminStorePath), true);
  assert.equal(fs.existsSync(moduleProfileUseCasesPath), true);
  assert.equal(fs.existsSync(moduleProfileAdminAuthPath), true);
  assert.equal(fs.existsSync(moduleProfileAdminStorePath), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "comments", "comment-types.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "comments", "comment-policy.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "comments", "comment-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "reactions", "reaction-policy.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "reactions", "reaction-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "profile", "profile-use-cases.ts")), false);
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
