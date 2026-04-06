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
  assert.match(eslintConfig, /@\/lib\/features\/\*/);
  assert.match(eslintConfig, /Production callers must import module-local application and ui entrypoints directly instead of legacy feature shims/);
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

test("module application services own runtime delegation and legacy feature services stay as shims", () => {
  const mealReadService = read("lib/modules/meals/application/meal-read-service.ts");
  const mealEditorService = read("lib/modules/meals/application/meal-editor-service.ts");
  const commentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const reactionService = read("lib/modules/reactions/application/meal-reaction-service.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");
  const featureMealReadService = read("lib/features/meals/application/meal-read-service.ts");
  const featureMealEditorService = read("lib/features/meals/application/meal-editor-service.ts");
  const featureCommentService = read("lib/features/comments/application/meal-comment-service.ts");
  const featureReactionService = read("lib/features/reactions/application/meal-reaction-service.ts");
  const featureUserSessionService = read("lib/features/profile/application/user-session-service.ts");

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

  assert.match(featureMealReadService, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(featureMealEditorService, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.match(featureCommentService, /from "@\/lib\/modules\/comments\/application\/meal-comment-service"/);
  assert.match(featureReactionService, /from "@\/lib\/modules\/reactions\/application\/meal-reaction-service"/);
  assert.match(featureUserSessionService, /from "@\/lib\/modules\/profile\/application\/user-session-service"/);
  assert.doesNotMatch(featureMealReadService, /meal-read-runtime/);
  assert.doesNotMatch(featureMealEditorService, /meal-editor-runtime/);
  assert.doesNotMatch(featureCommentService, /comment-runtime/);
  assert.doesNotMatch(featureReactionService, /reaction-runtime/);
  assert.doesNotMatch(featureUserSessionService, /user-session-runtime/);
});

test("active callers import module-local application and ui entrypoints instead of feature shims", () => {
  const homePage = read("app/page.tsx");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealCard = read("components/MealCard.tsx");
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const conversationPanel = read("components/meal-detail/MealConversationPanel.tsx");
  const userContext = read("context/UserContext.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");

  assert.match(homePage, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useMealsForDateController"/);
  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useWeeklyStatsController"/);
  assert.match(archivePage, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealDetailPage, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
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

test("meal upload and comment data adapters live inside feature modules while legacy paths stay as shims", () => {
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

  assert.match(
    read("lib/server/uploads/meal-image-use-cases.ts"),
    /from "@\/lib\/modules\/meals\/adapters\/storage\/meal-image-upload"/
  );
  assert.match(read("lib/client/comments.ts"), /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-client"/);
  assert.match(
    read("lib/meal-comments-store.ts"),
    /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-subscription-store"/
  );

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

test("activity logging and notification helpers live in module-local paths while legacy roots stay as shims", () => {
  const moduleActivityLogPath = path.join(
    process.cwd(),
    "lib",
    "modules",
    "activity",
    "server",
    "activity-log.ts"
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

  const activityLogShim = read("lib/activity-log.ts");
  const notificationShim = read("lib/activity.ts");
  const notificationClientShim = read("lib/client/activity.ts");
  const profilePage = read("app/profile/page.tsx");
  const profileSession = read("lib/client/profile-session.ts");
  const qaSession = read("lib/qa/session.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");

  assert.equal(fs.existsSync(moduleActivityLogPath), true);
  assert.equal(fs.existsSync(moduleNotificationDomainPath), true);
  assert.equal(fs.existsSync(moduleNotificationClientPath), true);

  assert.match(activityLogShim, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.match(notificationShim, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(
    notificationClientShim,
    /from "@\/lib\/modules\/profile\/adapters\/http\/profile-notification-client"/
  );

  assert.match(profilePage, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(profileSession, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(qaSession, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(profileUseCases, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(
    userSessionRuntime,
    /from "@\/lib\/modules\/profile\/adapters\/http\/profile-notification-client"/
  );
  assert.match(commentUseCases, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.match(reactionUseCases, /from "@\/lib\/modules\/activity\/server\/activity-log"/);

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
  const platformRouteAuth = read("lib/platform/auth/route-auth.ts");
  const platformServerAuth = read("lib/platform/auth/server-auth.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");
  const clientMeals = read("lib/client/meal-queries.ts");
  const clientMutations = read("lib/client/meal-mutations.ts");
  const commentClient = read("lib/modules/comments/adapters/firestore/comment-client.ts");
  const clientReactions = read("lib/client/reactions.ts");
  const clientActivity = read("lib/client/activity.ts");
  const moduleNotificationClient = read(
    "lib/modules/profile/adapters/http/profile-notification-client.ts"
  );
  const clientProfileSession = read("lib/client/profile-session.ts");
  const uploadHelper = read("lib/uploadImage.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");
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
  assert.match(profileAuthContext, /from "@\/lib\/firebase-admin"/);

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

  assert.match(clientActivity, /from "@\/lib\/modules\/profile\/adapters\/http\/profile-notification-client"/);

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
