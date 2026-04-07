import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const exists = (relativePath) => fs.existsSync(path.join(process.cwd(), relativePath));
const mealCardPath = "lib/modules/meals/ui/components/MealCard.tsx";
const mealPreviewCardPath = "lib/modules/meals/ui/components/MealPreviewCard.tsx";
const mealConversationPanelPath = "lib/modules/meals/ui/components/MealConversationPanel.tsx";
const mealDetailSummaryPath = "lib/modules/meals/ui/components/MealDetailSummary.tsx";
const mealPhotoStagePath = "lib/modules/meals/ui/components/MealPhotoStage.tsx";
const mealDateTimeFieldsPath = "lib/modules/meals/ui/components/MealDateTimeFields.tsx";
const mealDetailsSectionPath = "lib/modules/meals/ui/components/MealDetailsSection.tsx";
const mealImageFieldPath = "lib/modules/meals/ui/components/MealImageField.tsx";
const useMealImageSelectionPath = "lib/modules/meals/ui/useMealImageSelection.ts";
const useSelectedDatePath = "lib/modules/meals/ui/useSelectedDate.ts";
const profileLoginViewPath = "lib/modules/profile/ui/LoginView.tsx";
const profilePageControllerPath = "lib/modules/profile/ui/useProfilePageController.ts";
const profileRoleSectionPath = "lib/modules/profile/ui/components/ProfileRoleSection.tsx";
const profileNotificationSectionPath = "lib/modules/profile/ui/components/ProfileNotificationSection.tsx";
const commentComposerPath = "lib/modules/comments/ui/components/CommentComposer.tsx";
const commentItemPath = "lib/modules/comments/ui/components/CommentItem.tsx";
const commentThreadPath = "lib/modules/comments/ui/components/CommentThread.tsx";

test("global styles are locked to light color scheme", () => {
  const globals = read("app/globals.css");
  assert.match(globals, /color-scheme:\s*light;/);
  assert.doesNotMatch(globals, /prefers-color-scheme:\s*dark/);
});

test("viewport metadata uses fixed light theme color", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /colorScheme:\s*"light"/);
  assert.match(layout, /themeColor:\s*"#FAFAF5"/);
  assert.doesNotMatch(layout, /maximumScale:\s*1/);
  assert.doesNotMatch(layout, /userScalable:\s*false/);
  assert.doesNotMatch(layout, /prefers-color-scheme/);
});

test("comment and form inputs use shared input classes", () => {
  const commentComposer = read(commentComposerPath);
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
  const mealDateTimeFields = read(mealDateTimeFieldsPath);
  const mealDetailsSection = read(mealDetailsSectionPath);
  const profilePage = read("app/profile/page.tsx");
  const homePage = read("app/page.tsx");
  const pageHeader = read("components/PageHeader.tsx");
  const surfaceSection = read("components/SurfaceSection.tsx");

  assert.match(commentComposer, /className="input-base input-pill comment-input"/);
  assert.match(commentComposer, /data-testid="meal-card-comment-input"/);
  assert.match(homePage, /data-testid="home-logout-button"/);
  assert.match(homePage, /page-shell/);
  assert.match(addPage, /page-shell/);
  assert.match(editPage, /page-shell/);
  assert.match(profilePage, /page-shell/);
  assert.match(homePage, /surface-card/);
  assert.match(pageHeader, /export default function PageHeader/);
  assert.match(surfaceSection, /export default function SurfaceSection/);
  assert.match(mealDetailsSection, /className="input-base textarea-base"/);
  assert.match(mealDateTimeFields, /type="date"/);
  assert.match(mealDateTimeFields, /type="time"/);
  assert.match(editPage, /dateTestId="edit-meal-date-input"/);
  assert.match(editPage, /timeTestId="edit-meal-time-input"/);
});

test("edit page waits for auth loading before redirecting", () => {
  const editPage = read("app/edit/[id]/page.tsx");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");

  assert.match(editPage, /useEditMealPageController/);
  assert.match(editController, /const \{ userProfile, loading: authLoading \} = useUser\(\);/);
  assert.match(editController, /if \(authLoading\) \{\s*return;\s*\}/s);
  assert.match(editController, /isLoading: authLoading \|\| mealLoading/);
});

test("login view uses the refreshed onboarding layout and shared CSS hooks", () => {
  const loginView = read(profileLoginViewPath);
  const layoutStyles = read("app/styles/layout.css");
  const profileSessionProvider = read("lib/modules/profile/ui/UserSessionProvider.tsx");
  const userContext = read("context/UserContext.tsx");

  assert.match(loginView, /login-screen/);
  assert.match(loginView, /login-brand-mark/);
  assert.match(loginView, /login-divider/);
  assert.match(loginView, /login-google-button/);
  assert.match(loginView, /login-security-badge/);
  assert.match(loginView, /계속하려면 로그인하세요/);
  assert.match(loginView, /role-selection-screen/);
  assert.match(loginView, /role-selection-list/);
  assert.match(loginView, /role-selection-card/);
  assert.match(loginView, /한 번만 선택하면 됩니다/);

  assert.match(layoutStyles, /\.login-screen\s*\{/);
  assert.match(layoutStyles, /\.login-google-button\s*\{/);
  assert.match(layoutStyles, /\.role-selection-card\s*\{/);
  assert.match(
    profileSessionProvider,
    /const shouldUseRedirectSignIn = \(code: string\): boolean =>\s*code === "auth\/popup-blocked" \|\|\s*code === "auth\/operation-not-supported-in-this-environment";/s
  );
  assert.match(
    profileSessionProvider,
    /const shouldIgnorePopupDismissal = \(code: string\): boolean =>\s*code === "auth\/popup-closed-by-user" \|\|\s*code === "auth\/cancelled-popup-request";/s
  );
  assert.match(profileSessionProvider, /if \(shouldIgnorePopupDismissal\(code\)\) \{\s*return;\s*\}/s);
  assert.match(userContext, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
});

test("update banner is wired into root layout", () => {
  const layout = read("app/layout.tsx");
  const cleanup = read("lib/platform/pwa/ServiceWorkerCleanup.tsx");
  const cleanupShim = read("components/ServiceWorkerCleanup.tsx");
  const errorMonitor = read("lib/platform/monitoring/ClientErrorMonitor.tsx");
  const errorMonitorShim = read("components/ClientErrorMonitor.tsx");
  const updateBannerShim = read("components/AppUpdateBanner.tsx");
  assert.match(layout, /import dynamic from "next\/dynamic"/);
  assert.match(layout, /import ClientErrorMonitor from "@\/lib\/platform\/monitoring\/ClientErrorMonitor"/);
  assert.match(layout, /import ServiceWorkerCleanup from "@\/lib\/platform\/pwa\/ServiceWorkerCleanup"/);
  assert.match(layout, /const AppUpdateBanner = dynamic\(\(\) => import\("@\/lib\/platform\/pwa\/AppUpdateBanner"\)\)/);
  assert.match(layout, /publicEnv\.enablePwa && <AppUpdateBanner \/>/);
  assert.match(layout, /shouldCleanupServiceWorker && <ServiceWorkerCleanup \/>/);
  assert.match(layout, /<ClientErrorMonitor \/>/);
  assert.doesNotMatch(layout, /import AppUpdateBanner from "@\/components\/AppUpdateBanner"/);
  assert.doesNotMatch(layout, /id="cleanup-sw"/);
  assert.doesNotMatch(layout, /id="client-error-monitor"/);
  assert.doesNotMatch(layout, /import Script from "next\/script"/);

  assert.match(cleanup, /localStorage\.getItem/);
  assert.match(cleanup, /localStorage\.setItem/);
  assert.match(cleanup, /navigator\.serviceWorker\.getRegistrations/);
  assert.match(cleanupShim, /from "@\/lib\/platform\/pwa\/ServiceWorkerCleanup"/);
  assert.match(errorMonitor, /navigator\.sendBeacon/);
  assert.match(errorMonitor, /window\.addEventListener\("error"/);
  assert.match(errorMonitor, /window\.addEventListener\("unhandledrejection"/);
  assert.match(errorMonitorShim, /from "@\/lib\/platform\/monitoring\/ClientErrorMonitor"/);
  assert.match(updateBannerShim, /from "@\/lib\/platform\/pwa\/AppUpdateBanner"/);
});

test("unused app page module stylesheet is removed", () => {
  const stylesheetPath = path.join(process.cwd(), "app", "page.module.css");
  assert.equal(fs.existsSync(stylesheetPath), false);
});

test("qa route for meal card e2e exists", () => {
  const qaPagePath = path.join(process.cwd(), "app", "qa", "meal-card", "page.tsx");
  assert.equal(fs.existsSync(qaPagePath), true);
});

test("qa behavior is isolated behind module-local application and ui services", () => {
  const homePage = read("app/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const addPage = read("app/add/page.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const archivePage = read("app/archive/page.tsx");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const profileSessionProvider = read("lib/modules/profile/ui/UserSessionProvider.tsx");
  const userContext = read("context/UserContext.tsx");
  const mealCommentsHook = read("lib/modules/comments/ui/useMealCommentsController.ts");
  const mealReactionsHook = read("lib/modules/reactions/ui/useMealReactionsController.ts");
  const mealsHook = read("lib/modules/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/modules/meals/ui/useWeeklyStatsController.ts");
  const mealCommentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const mealReactionService = read("lib/modules/reactions/application/meal-reaction-service.ts");
  const mealReadService = read("lib/modules/meals/application/meal-read-service.ts");
  const mealEditorService = read("lib/modules/meals/application/meal-editor-service.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");
  const reactionRuntime = read("lib/modules/reactions/infrastructure/reaction-runtime.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");
  const mealEditorRuntime = read("lib/modules/meals/infrastructure/meal-editor-runtime.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");
  const qaMealsAdapter = read("lib/qa/adapters/meals.ts");
  const qaCommentsAdapter = read("lib/qa/adapters/comments.ts");
  const qaReactionsAdapter = read("lib/qa/adapters/reactions.ts");
  const qaProfileAdapter = read("lib/qa/adapters/profile.ts");
  const qaRuntime = read("lib/qa/runtime.ts");

  assert.match(homePage, /@\/lib\/modules\/meals\/ui\/useHomePageController/);
  assert.match(homeController, /@\/lib\/modules\/meals\/application\/meal-read-service/);
  assert.match(addPage, /@\/lib\/modules\/meals\/ui\/useAddMealPageController/);
  assert.match(addController, /@\/lib\/modules\/meals\/application\/meal-editor-service/);
  assert.match(archivePage, /@\/lib\/modules\/meals\/ui\/useArchivePageController/);
  assert.match(archiveController, /@\/lib\/modules\/meals\/application\/meal-read-service/);
  assert.match(mealDetailPage, /@\/lib\/modules\/meals\/ui\/useMealDetailPageController/);
  assert.match(mealDetailController, /@\/lib\/modules\/meals\/application\/meal-read-service/);
  assert.match(profileSessionProvider, /@\/lib\/modules\/profile\/application\/user-session-service/);
  assert.match(userContext, /@\/lib\/modules\/profile\/ui\/UserSessionProvider/);
  assert.match(mealCommentsHook, /@\/lib\/modules\/comments\/application\/meal-comment-service/);
  assert.match(mealReactionsHook, /@\/lib\/modules\/reactions\/application\/meal-reaction-service/);
  assert.match(mealsHook, /@\/lib\/modules\/meals\/application\/meal-read-service/);
  assert.match(weeklyStatsHook, /@\/lib\/modules\/meals\/application\/meal-read-service/);

  assert.doesNotMatch(homePage, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(homeController, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(addPage, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(addController, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(archivePage, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(archiveController, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealDetailPage, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealDetailController, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(userContext, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealCommentsHook, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealReactionsHook, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealsHook, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(weeklyStatsHook, /@\/lib\/qa\/runtime/);

  assert.match(mealCommentService, /@\/lib\/modules\/comments\/infrastructure\/comment-runtime/);
  assert.match(mealReactionService, /@\/lib\/modules\/reactions\/infrastructure\/reaction-runtime/);
  assert.match(mealReadService, /@\/lib\/modules\/meals\/infrastructure\/meal-read-runtime/);
  assert.match(mealEditorService, /@\/lib\/modules\/meals\/infrastructure\/meal-editor-runtime/);
  assert.match(userSessionService, /@\/lib\/modules\/profile\/infrastructure\/user-session-runtime/);
  assert.match(commentRuntime, /@\/lib\/qa\/adapters\/comments/);
  assert.match(reactionRuntime, /@\/lib\/qa\/adapters\/reactions/);
  assert.match(mealReadRuntime, /@\/lib\/qa\/adapters\/meals/);
  assert.match(mealEditorRuntime, /@\/lib\/qa\/adapters\/meals/);
  assert.match(userSessionRuntime, /@\/lib\/qa\/adapters\/profile/);
  assert.doesNotMatch(commentRuntime, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(reactionRuntime, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealReadRuntime, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(mealEditorRuntime, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(userSessionRuntime, /@\/lib\/qa\/runtime/);
  assert.doesNotMatch(addPage, /@\/lib\/qa\/fixtures/);
  assert.doesNotMatch(archivePage, /@\/lib\/qa\/fixtures/);
  assert.doesNotMatch(mealDetailPage, /@\/lib\/qa\/fixtures/);
  assert.doesNotMatch(userContext, /@\/lib\/qa\/session/);
  assert.doesNotMatch(userContext, /@\/lib\/qa\/mode/);
  assert.match(qaMealsAdapter, /export const getQaMealsForDate =/);
  assert.match(qaCommentsAdapter, /export const createQaMealComment =/);
  assert.match(qaReactionsAdapter, /export const toggleQaMealReaction =/);
  assert.match(qaProfileAdapter, /export const getQaUserContextValue =/);
  assert.match(qaRuntime, /export const isQaRuntimeActive =/);
  assert.match(qaRuntime, /export const getQaMealsForDate =/);
  assert.match(qaRuntime, /export const saveQaMeal =/);
  assert.match(qaRuntime, /export const getQaUserContextValue =/);
});

test("qa route is gated in production", () => {
  const qaPage = read("app/qa/meal-card/page.tsx");
  assert.match(qaPage, /process\.env\.NODE_ENV !== "production"/);
  assert.match(qaPage, /@\/lib\/config\/public-env/);
  assert.match(qaPage, /publicEnv\.enableQa/);
  assert.match(qaPage, /notFound\(\)/);
});

test("qa proxy supports token-based protection", () => {
  const proxy = read("proxy.ts");
  const qaAccess = read("lib/qa-access.ts");
  assert.match(proxy, /@\/lib\/config\/server-env/);
  assert.match(proxy, /serverEnv\.qaRouteToken/);
  assert.match(proxy, /qa_token/);
  assert.match(proxy, /x-qa-token/);
  assert.match(proxy, /matcher:\s*\["\/qa\/:path\*"\]/);
  assert.match(proxy, /canAccessQaRoute/);
  assert.match(qaAccess, /if \(!qaRouteToken\)\s*{\s*return false;\s*}/);
});

test("comment mutations are handled by server APIs and update parent commentCount", () => {
  const commentCommandClient = read("lib/modules/comments/adapters/http/comment-command-client.ts");
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const deleteRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");

  assert.match(commentCommandClient, /\/api\/meals\/\$\{encodedMealId\}\/comments/);
  assert.match(commentCommandClient, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}/);
  assert.doesNotMatch(commentCommandClient, /runTransaction\(/);
  assert.equal(exists("lib/client/comments.ts"), false);
  assert.match(createRoute, /createMealComment/);
  assert.match(deleteRoute, /deleteMealCommentById/);
});

test("reaction mutations are handled by dedicated APIs with shared validation", () => {
  const reactionClient = read("lib/modules/reactions/adapters/http/reaction-client.ts");
  const reactionBar = read("lib/modules/reactions/ui/components/ReactionBar.tsx");
  const reactionBarShim = read("components/ReactionBar.tsx");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const reactionHelpers = read("lib/reactions.ts");
  const moduleReactionMap = read("lib/modules/reactions/domain/reaction-map.ts");
  const reactionPolicy = read("lib/modules/reactions/server/reaction-policy.ts");

  assert.match(reactionClient, /\/api\/meals\/\$\{encodedMealId\}\/reactions/);
  assert.match(reactionClient, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}\/reactions/);
  assert.match(reactionClient, /from "@\/lib\/modules\/reactions\/domain\/reaction-map"/);
  assert.match(reactionBar, /data-testid=\{`\$\{scope\}-reaction-chip-\$\{option\.key\}`\}/);
  assert.match(reactionBar, /from "@\/lib\/modules\/reactions\/domain\/reaction-map"/);
  assert.match(reactionBarShim, /from "@\/lib\/modules\/reactions\/ui\/components\/ReactionBar"/);
  assert.match(mealReactionRoute, /parseReactionPayload/);
  assert.match(commentReactionRoute, /parseReactionPayload/);
  assert.match(reactionPolicy, /ALLOWED_REACTION_EMOJIS/);
  assert.match(reactionPolicy, /from "@\/lib\/modules\/reactions\/domain\/reaction-map"/);
  assert.match(reactionHelpers, /from "@\/lib\/modules\/reactions\/domain\/reaction-map"/);
  assert.match(moduleReactionMap, /export const ALLOWED_REACTION_EMOJIS/);
});

test("comment routes support replies and safe parent deletion guards", () => {
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentAdminStore = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");
  const mealCard = read(mealCardPath);
  const mealConversationPanel = read(mealConversationPanelPath);
  const commentItem = read(commentItemPath);
  const commentComposer = read(commentComposerPath);
  const homePage = read("app/page.tsx");
  const filterChips = read("components/FilterChips.tsx");
  const archivePage = read("app/archive/page.tsx");
  const activitySummaryPath = path.join(process.cwd(), "components", "ActivitySummary.tsx");

  assert.match(createRoute, /parentId/);
  assert.match(commentUseCases, /comment-admin-store/);
  assert.match(commentAdminStore, /mentionedAuthor/);
  assert.match(commentAdminStore, /where\("parentId", "==", commentId\)/);
  assert.match(commentAdminStore, /Reply comments exist/);
  assert.match(mealCard, /MealConversationPanel/);
  assert.match(mealConversationPanel, /CommentThread/);
  assert.match(commentItem, /comment-reply-button-/);
  assert.match(commentComposer, /comment-reply-target/);
  assert.match(filterChips, /data-testid=\{`\$\{testIdPrefix\}-\$\{option\}`\}/);
  assert.equal(fs.existsSync(activitySummaryPath), false);
  assert.match(homePage, /MealPreviewCard/);
  assert.match(archivePage, /archive-load-more/);
});

test("home is rewritten as a weekly photo journal with a persistent bottom dock", () => {
  const globals = read("app/globals.css");
  const homePage = read("app/page.tsx");
  const mealPreviewCard = read(mealPreviewCardPath);
  const navbar = read("components/Navbar.tsx");
  const weekDateStrip = read("components/WeekDateStrip.tsx");
  const commentThread = read(commentThreadPath);
  const commentItem = read(commentItemPath);
  const commentComposer = read(commentComposerPath);
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealPhotoStage = read(mealPhotoStagePath);
  const mealDetailSummary = read(mealDetailSummaryPath);
  const mealConversationPanel = read(mealConversationPanelPath);

  assert.match(globals, /@import "\.\/styles\/layout\.css";/);
  assert.match(globals, /@import "\.\/styles\/forms\.css";/);
  assert.match(globals, /@import "\.\/styles\/comments\.css";/);
  assert.match(globals, /@import "\.\/styles\/activity\.css";/);
  assert.match(homePage, /WeekDateStrip/);
  assert.match(homePage, /home-journal-card/);
  assert.match(homePage, /home-calendar-toggle/);
  assert.match(homePage, /MealPreviewCard/);
  assert.match(homePage, /home-archive-link/);
  assert.doesNotMatch(homePage, /ActivitySummary/);
  assert.doesNotMatch(homePage, /ActivityFeed/);
  assert.doesNotMatch(homePage, /FilterChips/);
  assert.match(mealPreviewCard, /meal-preview-open-/);
  assert.match(mealPreviewCard, /meal-preview-card-/);
  assert.match(navbar, /data-testid="bottom-dock"/);
  assert.match(navbar, /data-testid="bottom-dock-add"/);
  assert.match(weekDateStrip, /data-testid="week-date-strip"/);
  assert.match(weekDateStrip, /week-date-thumbnail/);
  assert.match(weekDateStrip, /data-has-meals/);
  assert.match(archivePage, /FilterChips/);
  assert.match(archivePage, /MealPreviewCard/);
  assert.match(archivePage, /archive-group-/);
  assert.match(archivePage, /archive-suggestion-user-/);
  assert.match(mealDetailPage, /MealCard/);
  assert.match(mealDetailPage, /meal-detail-screen/);
  assert.match(mealPhotoStage, /meal-photo-stage/);
  assert.match(mealPhotoStage, /meal-photo-rail-item-/);
  assert.match(mealDetailSummary, /meal-detail-summary/);
  assert.match(mealConversationPanel, /meal-conversation-panel/);
  assert.match(commentThread, /comment-thread-reply/);
  assert.match(commentItem, /comment-reply-button-/);
  assert.match(commentComposer, /comment-reply-target/);
});

test("archive page uses server-backed pagination instead of fixed recent client snapshots", () => {
  const archivePage = read("app/archive/page.tsx");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealQueryClient = read("lib/modules/meals/adapters/http/meal-query-client.ts");

  assert.match(archivePage, /archive-partial-note/);
  assert.match(archivePage, /archive-load-more/);
  assert.match(archiveController, /nextCursor/);
  assert.match(archiveController, /loadMoreMeals/);
  assert.match(archiveController, /hasMore/);
  assert.match(archiveController, /loadArchiveMealsForViewer\(\{/);
  assert.match(archiveController, /cursor: nextCursor/);
  assert.doesNotMatch(archiveController, /visibleCount/);
  assert.doesNotMatch(archiveController, /getRecentMeals\(/);
  assert.doesNotMatch(archiveController, /searchMeals\(/);
  assert.match(mealQueryClient, /export const listArchiveMeals = async/);
  assert.match(mealQueryClient, /\/api\/archive\?/);
  assert.match(mealQueryClient, /isPartial\?: boolean/);
});

test("meal card uses extracted hooks, shared comment subscription store, and shared time formatting", () => {
  const mealCard = read(mealCardPath);
  const mealCommentsHook = read("lib/modules/comments/ui/useMealCommentsController.ts");
  const mealReactionsHook = read("lib/modules/reactions/ui/useMealReactionsController.ts");
  const mealCommentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");
  const commentsStore = read("lib/modules/comments/adapters/firestore/comment-subscription-store.ts");
  const timeUtils = read("lib/time.ts");
  const commentItem = read(commentItemPath);
  const commentThread = read(commentThreadPath);
  const conversationPanel = read(mealConversationPanelPath);

  assert.match(mealCard, /useMealComments/);
  assert.match(mealCard, /useMealReactions/);
  assert.match(mealCard, /const \[commentsOpen, setCommentsOpen\] = useState\(true\)/);
  assert.doesNotMatch(mealCard, /subscribeMealComments/);
  assert.doesNotMatch(mealCard, /const formatRelativeTime =/);

  assert.match(mealCommentsHook, /watchMealCommentsForViewer/);
  assert.match(mealCommentsHook, /useMealCommentsController/);
  assert.match(mealReactionsHook, /useMealReactionsController/);
  assert.match(mealCommentService, /watchMealCommentsForViewerInRuntime/);
  assert.match(commentRuntime, /comment-subscription-store/);
  assert.match(commentRuntime, /subscribeToMealComments/);
  assert.match(commentsStore, /const commentEntries = new Map/);
  assert.match(commentsStore, /refCount/);
  assert.equal(exists("lib/meal-comments-store.ts"), false);
  assert.match(timeUtils, /export const formatRelativeTime =/);

  assert.match(commentItem, /from "@\/lib\/time"/);
  assert.match(commentThread, /from "@\/lib\/types"/);
  assert.doesNotMatch(commentItem, /formatRelativeTime:/);
  assert.doesNotMatch(conversationPanel, /formatRelativeTime:/);
});

test("edit page blocks legacy meal mutation locally and maps migration-required errors", () => {
  const editPage = read("app/edit/[id]/page.tsx");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");
  const mealErrors = read("lib/modules/meals/ui/meal-error-messages.ts");

  assert.match(editPage, /useEditMealPageController/);
  assert.match(editPage, /등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다\./);
  assert.match(editController, /requiresLegacyMigration/);
  assert.match(editController, /showToast\("등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다\.", "error"\)/);
  assert.doesNotMatch(editController, /needsOwnerAdoption/);
  assert.doesNotMatch(editController, /ownerUid: userProfile\.uid/);
  assert.equal(exists("lib/meal-errors.ts"), false);
  assert.match(mealErrors, /code === "legacy_meal_requires_migration"/);
  assert.match(mealErrors, /기존 기록이라 아직 수정할 수 없습니다\./);
});

test("navbar styles live in shared CSS and week strip exposes accessible labels", () => {
  const navbar = read("components/Navbar.tsx");
  const weekDateStrip = read("components/WeekDateStrip.tsx");
  const layoutStyles = read("app/styles/layout.css");

  assert.doesNotMatch(navbar, /style jsx/);
  assert.doesNotMatch(navbar, /nav-item-primary/);
  assert.doesNotMatch(navbar, /nav-icon-wrap-primary/);
  assert.match(layoutStyles, /\.navbar\s*\{/);
  assert.match(layoutStyles, /\.nav-icon-wrap\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*36px;[\s\S]*border-radius:\s*12px;/);
  assert.doesNotMatch(layoutStyles, /\.nav-item-primary\s*\{/);
  assert.doesNotMatch(layoutStyles, /\.nav-icon-wrap-primary\s*\{/);
  assert.match(weekDateStrip, /aria-label=/);
  assert.match(weekDateStrip, /선택한 날짜/);
});

test("dialog and toast providers use shared CSS classes instead of inline layout styles", () => {
  const confirmDialog = read("lib/platform/feedback/ConfirmDialog.tsx");
  const toast = read("lib/platform/feedback/ToastProvider.tsx");
  const confirmDialogShim = read("components/ConfirmDialog.tsx");
  const toastShim = read("components/Toast.tsx");
  const layoutStyles = read("app/styles/layout.css");

  assert.match(confirmDialog, /confirm-overlay/);
  assert.match(confirmDialog, /confirm-dialog/);
  assert.match(confirmDialog, /confirm-actions/);
  assert.doesNotMatch(confirmDialog, /style=\{\{/);

  assert.match(toast, /toast-viewport/);
  assert.match(toast, /toast-item/);
  assert.doesNotMatch(toast, /style=\{\{/);
  assert.match(confirmDialogShim, /from "@\/lib\/platform\/feedback\/ConfirmDialog"/);
  assert.match(toastShim, /from "@\/lib\/platform\/feedback\/ToastProvider"/);

  assert.match(layoutStyles, /\.confirm-overlay\s*\{/);
  assert.match(layoutStyles, /\.toast-viewport\s*\{/);
  assert.match(layoutStyles, /\.toast-item-visible\s*\{/);
});

test("next config is kept minimal and avoids placeholder comments", () => {
  const nextConfig = read("next.config.ts");

  assert.doesNotMatch(nextConfig, /config options here/);
  assert.match(nextConfig, /withPWA\(nextConfig\)/);
  assert.match(nextConfig, /turbopack:\s*\{\s*\}/);
  assert.doesNotMatch(nextConfig, /optimizePackageImports/);
});

test("default dev and build scripts use the Turbopack-ready path and keep explicit clean build", () => {
  const packageJson = read("package.json");
  const packageJsonData = JSON.parse(packageJson);
  const gitignore = read(".gitignore");
  const cleanNextDir = read("scripts/clean-next-dir.mjs");
  const buildRunner = read("scripts/run-next-build.mjs");

  assert.match(packageJson, /"dev":\s*"next dev"/);
  assert.match(packageJson, /"build":\s*"node scripts\/run-next-build\.mjs"/);
  assert.match(
    packageJson,
    /"build:clean":\s*"node scripts\/clean-next-dir\.mjs && node scripts\/run-next-build\.mjs"/
  );
  assert.match(packageJson, /"test:smoke:pwa":\s*"node scripts\/smoke-pwa-build\.mjs"/);
  assert.doesNotMatch(packageJson, /next dev --webpack/);
  assert.doesNotMatch(packageJson, /"build":\s*"node scripts\/clean-next-dir\.mjs/);
  assert.match(packageJson, /"@opentelemetry\/api":\s*"\^1\.9\.0"/);
  assert.match(
    packageJson,
    /"test:api":\s*"node --test tests\/api-security\.test\.mjs tests\/architecture-boundaries\.test\.mjs tests\/archive-query\.test\.mjs tests\/meal-image-policy\.test\.mjs"/
  );
  assert.match(packageJson, /"ci:verify":\s*"[^"]*npm run test:e2e"/);
  assert.match(packageJson, /"ci:verify":\s*"[^"]*npm run test:smoke:qa-token-required[^"]*"/);
  assert.match(gitignore, /\/public\/sw\.js/);
  assert.match(cleanNextDir, /workbox-/);
  assert.match(cleanNextDir, /swe-worker-/);
  assert.match(cleanNextDir, /sw\\\.js/);
  assert.match(buildRunner, /NEXT_PUBLIC_ENABLE_PWA === "true"/);
  assert.match(buildRunner, /next\.cmd/);
  assert.match(buildRunner, /"build", "--webpack"/);
  assert.match(buildRunner, /"build"\]/);
  assert.match(buildRunner, /using webpack for service worker generation/);
  assert.equal(packageJsonData.dependencies?.["@ducanh2912/next-pwa"], undefined);
  assert.match(packageJsonData.devDependencies?.["@ducanh2912/next-pwa"] ?? "", /^\^/);
});

test("pwa smoke script verifies generated assets and cleanup through the published npm command", () => {
  const packageJson = read("package.json");
  const smokeScript = read("scripts/smoke-pwa-build.mjs");
  const readme = read("README.md");

  assert.match(packageJson, /"test:smoke:pwa":\s*"node scripts\/smoke-pwa-build\.mjs"/);
  assert.match(smokeScript, /NEXT_PUBLIC_ENABLE_PWA:\s*"true"/);
  assert.match(smokeScript, /scripts\/clean-next-dir\.mjs/);
  assert.match(smokeScript, /npm", \["run", "build"\]/);
  assert.match(smokeScript, /sw\\\.js/);
  assert.match(smokeScript, /workbox-\.\*\\\.js/);
  assert.match(smokeScript, /swe-worker-\.\*\\\.js/);
  assert.match(smokeScript, /PWA smoke passed/);
  assert.match(readme, /npm run test:smoke:pwa/);
});

test("archive search defers remote querying until input settles", () => {
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");

  assert.match(archiveController, /useDeferredValue/);
  assert.match(archiveController, /deferredQuery/);
  assert.match(archiveController, /query\.trim\(\)/);
  assert.match(archiveController, /loadArchiveMealsForViewer\(\{/);
  assert.match(archiveController, /query: deferredQuery/);
  assert.match(archiveController, /requestSequenceRef/);
  assert.match(archiveController, /requestId !== requestSequenceRef\.current/);
  assert.match(archiveController, /let active = true/);
  assert.match(mealReadRuntime, /listArchiveMeals\(\{/);
});

test("client error route delegates ingestion to a platform helper", () => {
  const clientErrorsRoute = read("app/api/client-errors/route.ts");
  const clientErrorIngest = read("lib/platform/http/client-error-ingest.ts");

  assert.match(clientErrorsRoute, /from "@\/lib\/platform\/http\/client-error-ingest"/);
  assert.match(clientErrorsRoute, /from "@\/lib\/platform\/http\/route-handler"/);
  assert.match(clientErrorsRoute, /return handleRoute\(\(\) => ingestClientErrorReport\(request\)\);/);
  assert.doesNotMatch(clientErrorsRoute, /import\("@upstash\/ratelimit"\)/);
  assert.doesNotMatch(clientErrorsRoute, /import\("@upstash\/redis"\)/);
  assert.doesNotMatch(clientErrorsRoute, /const validateContentLengthHeader =/);
  assert.match(clientErrorIngest, /getUpstashLimiter/);
  assert.match(clientErrorIngest, /import\("@upstash\/ratelimit"\)/);
  assert.match(clientErrorIngest, /import\("@upstash\/redis"\)/);
});

test("public runtime env is centralized for pwa and qa UI gates", () => {
  const publicEnv = read("lib/config/public-env.ts");
  const nextConfig = read("next.config.ts");
  const updateBanner = read("lib/platform/pwa/AppUpdateBanner.tsx");
  const cleanup = read("lib/platform/pwa/ServiceWorkerCleanup.tsx");
  const updateBannerShim = read("components/AppUpdateBanner.tsx");
  const cleanupShim = read("components/ServiceWorkerCleanup.tsx");
  const pwaCache = read("lib/pwa-cache.ts");
  const qaMode = read("lib/qa/mode.ts");
  const qaPage = read("app/qa/meal-card/page.tsx");

  assert.match(publicEnv, /enablePwa:/);
  assert.match(publicEnv, /enableQa:/);
  assert.match(publicEnv, /appVersion:/);
  assert.doesNotMatch(publicEnv, /from "zod"/);
  assert.match(nextConfig, /from "@\/lib\/config\/public-env"/);
  assert.match(updateBanner, /from "@\/lib\/config\/public-env"/);
  assert.match(cleanup, /from "@\/lib\/config\/public-env"/);
  assert.match(updateBanner, /from "@\/lib\/pwa-cache"/);
  assert.match(cleanup, /from "@\/lib\/pwa-cache"/);
  assert.match(updateBannerShim, /from "@\/lib\/platform\/pwa\/AppUpdateBanner"/);
  assert.match(cleanupShim, /from "@\/lib\/platform\/pwa\/ServiceWorkerCleanup"/);
  assert.match(pwaCache, /APP_CACHE_PATTERNS/);
  assert.match(pwaCache, /shouldDeletePwaCache/);
  assert.match(qaMode, /from "@\/lib\/config\/public-env"/);
  assert.match(qaPage, /from "@\/lib\/config\/public-env"/);
  assert.doesNotMatch(nextConfig, /process\.env\.NEXT_PUBLIC_ENABLE_PWA/);
  assert.doesNotMatch(updateBanner, /process\.env\.NEXT_PUBLIC_ENABLE_PWA/);
  assert.doesNotMatch(cleanup, /process\.env\.NEXT_PUBLIC_APP_VERSION/);
  assert.doesNotMatch(qaMode, /process\.env\.NEXT_PUBLIC_ENABLE_QA/);
  assert.doesNotMatch(qaPage, /process\.env\.NEXT_PUBLIC_ENABLE_QA/);
});

test("maintenance scripts share smoke and admin helpers", () => {
  const backfillOwners = read("scripts/backfill-meal-owners.mjs");
  const migrateMeals = read("scripts/migrate-meals-schema.mjs");
  const migrateComments = read("scripts/migrate-comments-to-subcollection.mjs");
  const smokeTest = read("scripts/smoke-test.mjs");
  const smokeMealMutations = read("scripts/smoke-meal-mutations.mjs");
  const firebaseAdminHelper = read("scripts/lib/firebase-admin-app.mjs");
  const smokeHelper = read("scripts/lib/smoke-server.mjs");

  assert.match(backfillOwners, /\.\/lib\/firebase-admin-app\.mjs/);
  assert.match(migrateMeals, /\.\/lib\/firebase-admin-app\.mjs/);
  assert.match(migrateComments, /\.\/lib\/firebase-admin-app\.mjs/);
  assert.match(smokeTest, /\.\/lib\/smoke-server\.mjs/);
  assert.match(smokeMealMutations, /\.\/lib\/smoke-server\.mjs/);
  assert.match(smokeMealMutations, /new FormData\(\)/);
  assert.match(smokeMealMutations, /formData\.append\(\s*"file"/s);
  assert.doesNotMatch(smokeMealMutations, /JSON\.stringify\(\{ imageData/);
  assert.match(firebaseAdminHelper, /getAdminDbContext/);
  assert.match(smokeHelper, /startNpmScript/);
  assert.match(smokeHelper, /waitForServer/);
});

test("qa fixtures use readable Korean literals in source", () => {
  const qa = read("lib/qa/fixtures.ts");

  assert.match(qa, /테스트용 식사 기록입니다\./);
  assert.match(qa, /댓글 입력 가독성 테스트/);
  assert.doesNotMatch(qa, /\\uD14C\\uC2A4\\uD2B8/);
});

test("home page delegates date, meals, and weekly stats state to focused hooks", () => {
  const homePage = read("app/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const selectedDateHook = read(useSelectedDatePath);
  const mealsHook = read("lib/modules/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/modules/meals/ui/useWeeklyStatsController.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");
  const lazyCalendar = read("components/LazyCalendar.tsx");

  assert.match(homePage, /import dynamic from "next\/dynamic"/);
  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useHomePageController"/);
  assert.match(homePage, /const LazyCalendar = dynamic\(\(\) => import\("@\/components\/LazyCalendar"\)\)/);
  assert.match(homePage, /<LazyCalendar/);
  assert.match(homePage, /locale="ko-KR"/);
  assert.doesNotMatch(homePage, /import Calendar from "react-calendar"/);
  assert.doesNotMatch(homePage, /react-calendar\/dist\/Calendar\.css/);
  assert.doesNotMatch(homePage, /useSelectedDate/);
  assert.doesNotMatch(homePage, /useMealsForDate/);
  assert.doesNotMatch(homePage, /useWeeklyStats/);
  assert.doesNotMatch(homePage, /createMealRuntimeState/);
  assert.doesNotMatch(homePage, /const \[remoteMeals, setRemoteMeals\]/);
  assert.doesNotMatch(homePage, /const \[remoteWeeklyStats, setRemoteWeeklyStats\]/);
  assert.doesNotMatch(homePage, /const \[selectedDate, setSelectedDate\]/);

  assert.match(selectedDateHook, /export const useSelectedDate =/);
  assert.match(mealsHook, /export const useMealsForDateController =/);
  assert.match(weeklyStatsHook, /export const useWeeklyStatsController =/);
  assert.match(homeController, /useSelectedDate/);
  assert.match(homeController, /useMealsForDateController as useMealsForDate/);
  assert.match(homeController, /useWeeklyStatsController as useWeeklyStats/);
  assert.match(homeController, /createMealRuntimeState/);
  assert.match(mealsHook, /watchMealsForViewerDate/);
  assert.match(weeklyStatsHook, /loadWeeklyStatsForViewer/);
  assert.match(mealReadRuntime, /getWeeklyStats/);
  assert.match(lazyCalendar, /import Calendar from "react-calendar"/);
  assert.match(lazyCalendar, /react-calendar\/dist\/Calendar\.css/);
});

test("date-driven hooks clear stale meal state and cache weekly stats by week", () => {
  const mealsHook = read("lib/modules/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/modules/meals/ui/useWeeklyStatsController.ts");
  const mealQueryClient = read("lib/modules/meals/adapters/http/meal-query-client.ts");
  const mealFilters = read("lib/client/meal-filters.ts");

  assert.match(mealsHook, /setRemoteMeals\(\[\]\)/);
  assert.match(mealsHook, /loadedDateKey === currentDateKey/);
  assert.match(weeklyStatsHook, /remoteWeeklyStats/);
  assert.match(weeklyStatsHook, /weekKey/);
  assert.match(weeklyStatsHook, /loadedWeekKey === weekKey/);
  assert.match(weeklyStatsHook, /window\.addEventListener\("focus", handleFocus\)/);
  assert.match(weeklyStatsHook, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.doesNotMatch(weeklyStatsHook, /weeklyStatsCache/);
  assert.match(mealQueryClient, /MEAL_REFRESH_INTERVAL_MS/);
  assert.match(mealQueryClient, /\/api\/meals\/weekly-stats\?date=/);
  assert.match(mealFilters, /type DerivedMealMetrics =/);
  assert.match(mealFilters, /const derivedMeals = meals\.map\(\(meal\) =>/);
  assert.match(mealFilters, /engagementCount:/);
  assert.match(mealFilters, /reactionCount:/);
  assert.match(mealFilters, /commentCount:/);
  assert.match(mealFilters, /b\.engagementCount/);
  assert.match(mealFilters, /b\.reactionCount/);
  assert.match(mealFilters, /b\.commentCount/);
});

test("client error route rejects oversized content-length before reading the body", () => {
  const clientErrorIngest = read("lib/platform/http/client-error-ingest.ts");

  assert.match(clientErrorIngest, /const validateContentLengthHeader = \(request: Request\): void =>/);
  assert.match(clientErrorIngest, /validateContentLengthHeader\(request\);/);
  assert.match(clientErrorIngest, /const validateBodyByteLength = \(body: string\): void =>/);
  assert.match(clientErrorIngest, /validateBodyByteLength\(raw\);/);
});

test("update polling only runs when a service worker registration is available", () => {
  const updateBanner = read("lib/platform/pwa/AppUpdateBanner.tsx");
  const updateMonitor = read("lib/platform/pwa/useAppUpdateMonitor.ts");
  const updateMonitorShim = read("components/hooks/useAppUpdateMonitor.ts");

  assert.match(updateBanner, /useAppUpdateMonitor/);
  assert.match(updateMonitor, /if \(!registration\) return;/);
  assert.match(updateMonitor, /await setupServiceWorker\(\);/);
  assert.match(updateMonitor, /if \(registration\) \{/);
  assert.match(updateMonitor, /window\.setInterval/);
  assert.doesNotMatch(updateMonitor, /void checkForUpdate\(\);\s*\n\s*intervalId = window\.setInterval/);
  assert.match(updateMonitorShim, /from "@\/lib\/platform\/pwa\/useAppUpdateMonitor"/);
});

test("profile notification settings stay wired after removing dead activity feed ui", () => {
  const types = read("lib/types.ts");
  const notificationDomain = read("lib/modules/profile/domain/notification-preferences.ts");
  const profilePage = read("app/profile/page.tsx");
  const profilePageController = read(profilePageControllerPath);
  const profileNotificationSection = read(profileNotificationSectionPath);
  const profileSessionProvider = read("lib/modules/profile/ui/UserSessionProvider.tsx");
  const userContext = read("context/UserContext.tsx");
  const activityFeedPath = path.join(process.cwd(), "components", "ActivityFeed.tsx");

  assert.match(types, /notificationPreferences/);
  assert.doesNotMatch(types, /ActivityFeedItem/);
  assert.equal(exists("lib/client/activity.ts"), false);
  assert.match(notificationDomain, /DEFAULT_NOTIFICATION_PREFERENCES/);
  assert.equal(fs.existsSync(activityFeedPath), false);
  assert.match(profilePage, /from "@\/lib\/modules\/profile\/ui\/useProfilePageController"/);
  assert.match(profilePage, /from "@\/lib\/modules\/profile\/ui\/components\/ProfileNotificationSection"/);
  assert.match(profilePageController, /from "@\/lib\/modules\/profile\/domain\/notification-preferences"/);
  assert.match(profilePageController, /from "@\/lib\/platform\/feedback\/ToastProvider"/);
  assert.match(profileNotificationSection, /profile-notification-toggle-browserEnabled/);
  assert.match(profileNotificationSection, /profile-notification-toggle-reactionAlerts/);
  assert.match(profilePageController, /showToast\("알림 설정이 저장되었습니다\.", "success"\)/);
  assert.match(profilePageController, /showToast\("알림 설정 저장에 실패했습니다\.", "error"\)/);
  assert.match(profileSessionProvider, /updateNotificationPreferences/);
  assert.match(userContext, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
});

test("add flow remembers recent meal draft defaults", () => {
  const addPage = read("app/add/page.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const mealDateTimeFields = read(mealDateTimeFieldsPath);
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const mealImageField = read(mealImageFieldPath);
  const mealDraft = read("lib/modules/meals/domain/meal-draft.ts");
  const mealCopy = read("lib/modules/meals/domain/meal-copy.ts");
  const mealErrors = read("lib/modules/meals/ui/meal-error-messages.ts");
  const mealEditorRuntime = read("lib/modules/meals/infrastructure/meal-editor-runtime.ts");
  const selectedDateHook = read(useSelectedDatePath);
  const mealImageClient = read("lib/modules/meals/adapters/http/meal-image-client.ts");
  const mealMutationClient = read("lib/modules/meals/adapters/http/meal-mutation-client.ts");

  assert.match(addPage, /useAddMealPageController/);
  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/components\/MealDateTimeFields"/);
  assert.match(mealDateTimeFields, /type="date"/);
  assert.match(mealDateTimeFields, /type="time"/);
  assert.match(addPage, /dateTestId="add-meal-date-input"/);
  assert.match(addPage, /timeTestId="add-meal-time-input"/);
  assert.match(addController, /getMealDraftDefaults/);
  assert.match(addController, /saveMealDraftDefaults/);
  assert.match(addController, /buildAutoMealDescription/);
  assert.match(addController, /createMealRecord/);
  assert.match(addController, /combineDateAndTime/);
  assert.match(addController, /getMealFormDateTimeDefaults/);
  assert.match(mealImageField, /data-testid=\{inputTestId\}/);
  assert.match(addPage, /data-testid="add-quick-save"/);
  assert.match(addController, /toMealCreateErrorMessage/);
  assert.match(mealEditorRuntime, /uploadImage/);
  assert.equal(exists("lib/meal-draft.ts"), false);
  assert.equal(exists("lib/meal-copy.ts"), false);
  assert.equal(exists("lib/meal-errors.ts"), false);
  assert.match(mealErrors, /사진 업로드에 실패했습니다\./);
  assert.match(mealErrors, /식사 기록 저장에 실패했습니다\./);
  assert.match(homeController, /addMealHref:/);
  assert.match(homeController, /formatDateKey\(effectiveSelectedDate\)/);
  assert.match(selectedDateHook, /useSearchParams/);
  assert.match(mealDraft, /localStorage/);
  assert.match(mealDraft, /mealType/);
  assert.match(mealDraft, /participantIds/);
  assert.match(mealCopy, /buildAutoMealDescription/);
  assert.match(mealImageClient, /Authorization/);
  assert.match(mealImageClient, /\/api\/uploads\/meal-image/);
  assert.match(mealMutationClient, /\/api\/meals/);
});

test("home archive and detail pages delegate orchestration to page controllers", () => {
  const homePage = read("app/page.tsx");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");

  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useHomePageController"/);
  assert.match(archivePage, /from "@\/lib\/modules\/meals\/ui\/useArchivePageController"/);
  assert.match(mealDetailPage, /from "@\/lib\/modules\/meals\/ui\/useMealDetailPageController"/);

  assert.doesNotMatch(homePage, /from "@\/context\/UserContext"/);
  assert.doesNotMatch(archivePage, /from "@\/context\/UserContext"/);
  assert.doesNotMatch(mealDetailPage, /from "@\/context\/UserContext"/);
  assert.doesNotMatch(homePage, /createMealRuntimeState/);
  assert.doesNotMatch(archivePage, /createMealRuntimeState/);
  assert.doesNotMatch(mealDetailPage, /createMealRuntimeState/);

  assert.match(homeController, /export const useHomePageController =/);
  assert.match(homeController, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(archiveController, /export const useArchivePageController =/);
  assert.match(archiveController, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.match(archiveController, /loadArchiveMealsForViewer/);
  assert.match(mealDetailController, /export const useMealDetailPageController =/);
  assert.match(mealDetailController, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.match(mealDetailController, /loadMealForViewer/);
  assert.match(mealDetailController, /loadSameDayMealsForViewer/);
});

test("edit flow uses server mutation helper and specific failure copy", () => {
  const editPage = read("app/edit/[id]/page.tsx");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");
  const mealErrors = read("lib/modules/meals/ui/meal-error-messages.ts");

  assert.match(editPage, /useEditMealPageController/);
  assert.match(editController, /toMealUpdateErrorMessage/);
  assert.equal(exists("lib/meal-errors.ts"), false);
  assert.match(mealErrors, /사진 업로드에 실패했습니다\./);
  assert.match(mealErrors, /식사 기록 수정에 실패했습니다\./);
});

test("detail actions fail closed for legacy meals and preserve delete status handling", () => {
  const mealCard = read(mealCardPath);
  const mealMutationClient = read("lib/modules/meals/adapters/http/meal-mutation-client.ts");
  const mealContracts = read("lib/modules/meals/contracts.ts");
  const mealErrors = read("lib/modules/meals/ui/meal-error-messages.ts");
  const mealDetailSummary = read(mealDetailSummaryPath);

  assert.match(mealCard, /const isOwner = useMemo\(\(\) => \{\s*if \(!userProfile\) return false;\s*return Boolean\(meal\.ownerUid && meal\.ownerUid === userProfile\.uid\);/s);
  assert.doesNotMatch(mealCard, /uids\[0\] === userProfile\.role/);
  assert.match(mealContracts, /export type MealDeleteStatus =/);
  assert.match(mealContracts, /export type MealDeleteResult = \{\s*deleted: boolean;\s*status: MealDeleteStatus;\s*\}/s);
  assert.match(mealMutationClient, /from "@\/lib\/modules\/meals\/contracts"/);
  assert.match(mealCard, /from "@\/lib\/modules\/meals\/ui\/meal-error-messages"/);
  assert.match(mealCard, /switch \(result\.status\)/);
  assert.match(mealCard, /const \[isDeleting, setIsDeleting\] = useState\(false\);/);
  assert.match(mealCard, /if \(isDeleting\) return;/);
  assert.match(mealCard, /case "already_processing":/);
  assert.match(mealCard, /삭제 작업이 이미 진행 중입니다\./);
  assert.match(mealCard, /"info"/);
  assert.equal(exists("lib/meal-errors.ts"), false);
  assert.match(mealErrors, /기존 기록이라 아직 삭제할 수 없습니다\./);
  assert.match(mealCard, /case "already_deleted":/);
  assert.match(mealCard, /이미 삭제된 기록입니다\./);
  assert.match(mealErrors, /code === "unexpected_delete_status"/);
  assert.match(mealErrors, /삭제 상태를 확인하지 못했습니다\./);
  assert.doesNotMatch(mealCard, /showToast\("삭제 상태를 확인하지 못했습니다\.", "error"\)/);
  assert.match(mealDetailSummary, /deleteDisabled\?: boolean;/);
  assert.match(mealDetailSummary, /disabled=\{deleteDisabled\}/);
});

test("icon buttons and image overlay expose explicit accessibility labels", () => {
  const homePage = read("app/page.tsx");
  const mealDetailSummary = read(mealDetailSummaryPath);
  const mealPhotoStage = read(mealPhotoStagePath);

  assert.match(homePage, /aria-label="로그아웃"/);
  assert.match(mealDetailSummary, /aria-label="식사 기록 수정"/);
  assert.match(mealDetailSummary, /aria-label="식사 기록 삭제"/);
  assert.match(mealPhotoStage, /role="dialog"/);
  assert.match(mealPhotoStage, /aria-modal="true"/);
  assert.match(mealPhotoStage, /aria-label="식사 사진 크게 보기"/);
  assert.match(mealPhotoStage, /aria-label="사진 닫기"/);
});

test("legacy participant fallback is shared across archive cards and detail summary", () => {
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealPreviewCard = read(mealPreviewCardPath);
  const mealDetailSummary = read(mealDetailSummaryPath);
  const mealFilters = read("lib/client/meal-filters.ts");

  assert.match(mealPreviewCard, /meal\.userIds\?\.length \? meal\.userIds : meal\.userId \? \[meal\.userId\] : \[\]/);
  assert.match(mealDetailSummary, /meal\.userIds\?\.length \? meal\.userIds : meal\.userId \? \[meal\.userId\] : \[\]/);
  assert.match(archiveController, /const participantRoles = meal\.userIds\?\.length \? meal\.userIds : meal\.userId \? \[meal\.userId\] : \[\]/);
  assert.match(mealFilters, /const participantRoles = meal\.userIds\?\.length \? meal\.userIds : meal\.userId \? \[meal\.userId\] : \[\]/);
});

test("detail page guards meal and same-day fetches against stale responses", () => {
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const editPage = read("app/edit/[id]/page.tsx");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");

  assert.match(mealDetailPage, /useMealDetailPageController/);
  assert.match(mealDetailController, /const mealRequestSequenceRef = useRef\(0\)/);
  assert.match(mealDetailController, /const sameDayRequestSequenceRef = useRef\(0\)/);
  assert.match(mealDetailController, /const requestId = \+\+mealRequestSequenceRef\.current/);
  assert.match(mealDetailController, /const requestId = \+\+sameDayRequestSequenceRef\.current/);
  assert.match(mealDetailController, /if \(!active \|\| requestId !== mealRequestSequenceRef\.current\)/);
  assert.match(mealDetailController, /if \(!active \|\| requestId !== sameDayRequestSequenceRef\.current\)/);
  assert.match(editPage, /useEditMealPageController/);
  assert.match(editController, /const loadRequestSequenceRef = useRef\(0\)/);
  assert.match(editController, /const currentUid = userProfile\?\.uid/);
  assert.match(editController, /const currentRole = userProfile\?\.role/);
  assert.match(editController, /const showToastRef = useRef\(showToast\)/);
  assert.match(editController, /let active = true;/);
  assert.match(editController, /const requestId = \+\+loadRequestSequenceRef\.current/);
  assert.match(editController, /if \(!active \|\| requestId !== loadRequestSequenceRef\.current\) \{/);
  assert.doesNotMatch(editController, /\}, \[mealId, router, showToast, userProfile\]\);/);
});

test("detail page exits to archive after terminal delete outcomes and keyword search uses normalized participants", () => {
  const mealCard = read(mealCardPath);
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const mealQueryClient = read("lib/modules/meals/adapters/http/meal-query-client.ts");

  assert.match(mealCard, /onDeleted\?: \(result: MealDeleteResult\) => void/);
  assert.match(mealCard, /onDeleted\?\.\(result\)/);
  assert.match(mealDetailPage, /onDeleted=\{controller\.handleDeleted\}/);
  assert.match(mealDetailController, /handleDeleted: \(result: MealDeleteResult\) => \{/);
  assert.match(mealDetailController, /if \(result\.status === "completed" \|\| result\.status === "already_deleted"\) \{/);
  assert.match(mealDetailController, /router\.replace\("\/archive"\)/);
  assert.match(mealQueryClient, /const participantRoles = meal\.userIds\?\.length \? meal\.userIds : meal\.userId \? \[meal\.userId\] : \[\]/);
  assert.match(mealQueryClient, /participantRoles\.some\(\([A-Za-z_]+\) => [A-Za-z_]+\.toLowerCase\(\)\.includes\(lower\)\)/);
});

test("meal delete route uses idempotent server cleanup flow", () => {
  const deleteRoute = read("app/api/meals/[id]/route.ts");
  const mealDeleteUseCases = read("lib/modules/meals/server/meal-delete-use-cases.ts");
  const mealDeleteStore = read("lib/modules/meals/adapters/firestore/meal-delete-store.ts");
  assert.match(deleteRoute, /planMealDeleteOperation/);
  assert.match(deleteRoute, /deleteMealCommentsByMealId/);
  assert.match(deleteRoute, /deleteMealActivitiesByMealId/);
  assert.match(deleteRoute, /markMealDeleteJob/);
  assert.match(mealDeleteStore, /export const MEAL_DELETE_JOB_COLLECTION = "_maintenanceDeleteJobs"/);
  assert.match(mealDeleteUseCases, /status:\s*"processing"/);
  assert.match(deleteRoute, /status:\s*"completed"/);
  assert.match(deleteRoute, /status:\s*"failed"/);
  assert.match(mealDeleteUseCases, /deleteStoredMealCommentsByMealId/);
  assert.match(mealDeleteUseCases, /deleteStoredMealActivitiesByMealId/);
  assert.match(mealDeleteUseCases, /deleteStoredMealDocumentById/);
  assert.match(mealDeleteUseCases, /updateMealDeleteJob/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-delete-use-cases.ts")), false);
});

test("qa mock mode is disabled in production by env guard", () => {
  const qaLib = read("lib/qa/mode.ts");
  assert.match(qaLib, /NODE_ENV !== "production"/);
});

test("critical UI files are UTF-8 clean", () => {
  const criticalFiles = [
    "app/page.tsx",
    profileLoginViewPath,
    "components/LoginView.tsx",
    mealCardPath,
    "components/MealCard.tsx",
    "context/UserContext.tsx",
  ];

  for (const file of criticalFiles) {
    assert.doesNotMatch(read(file), /\uFFFD/);
  }
});

test("client data access is split into focused adapters and user context delegates profile I/O", () => {
  const mealQueryClient = read("lib/modules/meals/adapters/http/meal-query-client.ts");
  const mealMutationClient = read("lib/modules/meals/adapters/http/meal-mutation-client.ts");
  const mealFilters = read("lib/client/meal-filters.ts");
  const commentCommandClient = read("lib/modules/comments/adapters/http/comment-command-client.ts");
  const reactionClient = read("lib/modules/reactions/adapters/http/reaction-client.ts");
  const clientProfile = read("lib/client/profile.ts");
  const profileSessionClient = read("lib/modules/profile/adapters/http/profile-session-client.ts");
  const notificationClient = read("lib/modules/profile/adapters/http/profile-notification-client.ts");
  const authHttp = read("lib/platform/http/auth-http.ts");
  const mealCommentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const mealReactionService = read("lib/modules/reactions/application/meal-reaction-service.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");
  const reactionRuntime = read("lib/modules/reactions/infrastructure/reaction-runtime.ts");
  const mealCommentsHook = read("lib/modules/comments/ui/useMealCommentsController.ts");
  const mealReactionsHook = read("lib/modules/reactions/ui/useMealReactionsController.ts");
  const mealReadService = read("lib/modules/meals/application/meal-read-service.ts");
  const mealEditorService = read("lib/modules/meals/application/meal-editor-service.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");
  const mealEditorRuntime = read("lib/modules/meals/infrastructure/meal-editor-runtime.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");
  const mealsHook = read("lib/modules/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/modules/meals/ui/useWeeklyStatsController.ts");
  const archivePage = read("app/archive/page.tsx");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const mealCard = read(mealCardPath);
  const profilePage = read("app/profile/page.tsx");
  const profileRoleSection = read(profileRoleSectionPath);
  const profileSessionProvider = read("lib/modules/profile/ui/UserSessionProvider.tsx");
  const userContext = read("context/UserContext.tsx");
  const removedCompatFiles = [
    path.join(process.cwd(), "lib", "data.ts"),
    path.join(process.cwd(), "lib", "client", "http.ts"),
    path.join(process.cwd(), "lib", "client", "activity.ts"),
    path.join(process.cwd(), "lib", "client", "auth-http.ts"),
    path.join(process.cwd(), "lib", "client", "comments.ts"),
    path.join(process.cwd(), "lib", "client", "meals.ts"),
  ];

  assert.match(mealQueryClient, /export const getMealsForDate = async/);
  assert.match(mealQueryClient, /export const getMealById = async/);
  assert.match(mealMutationClient, /export const addMeal = async/);
  assert.match(mealMutationClient, /export const updateMeal = async/);
  assert.match(mealFilters, /export const filterAndSortMeals =/);
  assert.match(commentCommandClient, /export const addMealComment = async/);
  assert.match(commentCommandClient, /export const updateMealComment = async/);
  assert.match(commentCommandClient, /export const deleteMealComment = async/);
  assert.match(reactionClient, /export const toggleMealReaction = async/);
  assert.match(reactionClient, /export const toggleMealCommentReaction = async/);
  assert.match(clientProfile, /export const users =/);
  assert.match(profileSessionClient, /export const loadUserProfile = async/);
  assert.match(profileSessionClient, /export const saveUserRole = async/);
  assert.match(notificationClient, /export const updateNotificationPreferences = async/);
  assert.match(authHttp, /export const getAccessToken = async/);
  assert.match(authHttp, /export const parseErrorMessage = async/);
  removedCompatFiles.forEach((filePath) => assert.equal(fs.existsSync(filePath), false));

  assert.match(mealCommentService, /from "@\/lib\/modules\/comments\/infrastructure\/comment-runtime"/);
  assert.match(mealReactionService, /from "@\/lib\/modules\/reactions\/infrastructure\/reaction-runtime"/);
  assert.match(commentRuntime, /from "@\/lib\/modules\/comments\/adapters\/http\/comment-command-client"/);
  assert.match(reactionRuntime, /from "@\/lib\/modules\/reactions\/adapters\/http\/reaction-client"/);
  assert.match(mealCommentsHook, /from "@\/lib\/modules\/comments\/application\/meal-comment-service"/);
  assert.match(mealReactionsHook, /from "@\/lib\/modules\/reactions\/application\/meal-reaction-service"/);
  assert.match(mealReadService, /from "@\/lib\/modules\/meals\/infrastructure\/meal-read-runtime"/);
  assert.match(mealEditorService, /from "@\/lib\/modules\/meals\/infrastructure\/meal-editor-runtime"/);
  assert.match(mealReadRuntime, /from "@\/lib\/modules\/meals\/adapters\/http\/meal-query-client"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/modules\/meals\/adapters\/http\/meal-mutation-client"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/modules\/meals\/adapters\/http\/meal-query-client"/);
  assert.match(mealEditorRuntime, /from "@\/lib\/modules\/meals\/adapters\/http\/meal-image-client"/);
  assert.doesNotMatch(mealReadRuntime, /from "@\/lib\/client\/meals"/);
  assert.doesNotMatch(mealEditorRuntime, /from "@\/lib\/client\/meals"/);
  assert.match(userSessionService, /from "@\/lib\/modules\/profile\/infrastructure\/user-session-runtime"/);
  assert.match(userSessionRuntime, /from "@\/lib\/modules\/profile\/adapters\/http\/profile-session-client"/);
  assert.match(userSessionRuntime, /from "@\/lib\/modules\/profile\/adapters\/http\/profile-notification-client"/);
  assert.doesNotMatch(userSessionRuntime, /from "@\/lib\/client\/activity"/);
  assert.match(mealsHook, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(weeklyStatsHook, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(archivePage, /from "@\/lib\/modules\/meals\/ui\/useArchivePageController"/);
  assert.match(archiveController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealDetailPage, /from "@\/lib\/modules\/meals\/ui\/useMealDetailPageController"/);
  assert.match(mealDetailController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealCard, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.match(mealCard, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.match(profilePage, /from "@\/lib\/modules\/profile\/ui\/useProfilePageController"/);
  assert.match(profileRoleSection, /from "@\/lib\/domain\/user-role"/);
  assert.doesNotMatch(mealCard, /from "@\/lib\/client\/meals"/);
  assert.doesNotMatch(profilePage, /from "@\/lib\/client\/profile"/);
  assert.match(profileSessionProvider, /from "@\/lib\/modules\/profile\/application\/user-session-service"/);
  assert.match(userContext, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.doesNotMatch(userContext, /doc, getDoc/);
});

test("meal date hooks are routed through module ui controllers and upload helper reuses shared auth http", () => {
  const homePage = read("app/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const mealsController = read("lib/modules/meals/ui/useMealsForDateController.ts");
  const weeklyStatsController = read("lib/modules/meals/ui/useWeeklyStatsController.ts");
  const mealImageClient = read("lib/modules/meals/adapters/http/meal-image-client.ts");
  const removedCompatHooks = [
    path.join(process.cwd(), "components", "hooks", "useMealComments.ts"),
    path.join(process.cwd(), "components", "hooks", "useMealReactions.ts"),
    path.join(process.cwd(), "components", "hooks", "useMealsForDate.ts"),
    path.join(process.cwd(), "components", "hooks", "useWeeklyStats.ts"),
  ];

  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useHomePageController"/);
  assert.doesNotMatch(homePage, /@\/components\/hooks\/useMealsForDate/);
  assert.doesNotMatch(homePage, /@\/components\/hooks\/useWeeklyStats/);
  assert.doesNotMatch(homePage, /from "@\/lib\/modules\/meals\/ui\/useMealsForDateController"/);
  assert.doesNotMatch(homePage, /from "@\/lib\/modules\/meals\/ui\/useWeeklyStatsController"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/ui\/useMealsForDateController"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/ui\/useWeeklyStatsController"/);
  assert.match(mealsController, /export const useMealsForDateController =/);
  assert.match(weeklyStatsController, /export const useWeeklyStatsController =/);
  removedCompatHooks.forEach((filePath) => assert.equal(fs.existsSync(filePath), false));

  assert.match(mealImageClient, /from "@\/lib\/platform\/http\/auth-http"/);
  assert.doesNotMatch(mealImageClient, /const parseErrorMessage = async/);
});

test("stale generated assets are removed from the tracked source tree", () => {
  const staleServiceWorkerPath = path.join(process.cwd(), "public", "sw.js");
  const staleDemoAssetPath = path.join(process.cwd(), "public", "videos", "demo.webp");

  assert.equal(fs.existsSync(staleServiceWorkerPath), false);
  assert.equal(fs.existsSync(staleDemoAssetPath), false);
});

test("runtime pages avoid compat meal barrel and comment store reuses shared serializers", () => {
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");
  const commentsStore = read("lib/modules/comments/adapters/firestore/comment-subscription-store.ts");

  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/useAddMealPageController"/);
  assert.match(editPage, /from "@\/lib\/modules\/meals\/ui\/useEditMealPageController"/);
  assert.match(addController, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.match(editController, /from "@\/lib\/modules\/meals\/application\/meal-editor-service"/);
  assert.doesNotMatch(addPage, /@\/lib\/data/);
  assert.doesNotMatch(editPage, /@\/lib\/data/);
  assert.doesNotMatch(addController, /@\/lib\/data/);
  assert.doesNotMatch(editController, /@\/lib\/data/);

  assert.match(commentsStore, /from "@\/lib\/client\/serializers"/);
  assert.equal(exists("lib/meal-comments-store.ts"), false);
  assert.doesNotMatch(commentsStore, /const normalizeComment =/);
  assert.doesNotMatch(commentsStore, /const convertCommentDoc =/);
});

test("eslint guards forbid compat barrels and direct console usage", () => {
  const eslintConfig = read("eslint.config.mjs");

  assert.match(eslintConfig, /no-console/);
  assert.match(eslintConfig, /@\/lib\/data/);
  assert.match(eslintConfig, /@\/lib\/server-meals/);
  assert.match(eslintConfig, /@\/lib\/activity/);
  assert.match(eslintConfig, /@\/lib\/activity-log/);
  assert.match(eslintConfig, /@\/lib\/client\/activity/);
});

test("meal editor pages reuse focused meal form helpers and direct public env config", () => {
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
  const addController = read("lib/modules/meals/ui/useAddMealPageController.ts");
  const editController = read("lib/modules/meals/ui/useEditMealPageController.ts");
  const mealImageField = read(mealImageFieldPath);
  const mealDetailsSection = read(mealDetailsSectionPath);
  const mealForm = read("lib/modules/meals/domain/meal-form.ts");
  const imagePolicy = read("lib/modules/meals/domain/meal-image-policy.ts");
  const imageHook = read(useMealImageSelectionPath);
  const mealEditorService = read("lib/modules/meals/application/meal-editor-service.ts");
  const mealEditorRuntime = read("lib/modules/meals/infrastructure/meal-editor-runtime.ts");
  const layout = read("app/layout.tsx");
  const firebase = read("lib/firebase.ts");

  assert.match(mealForm, /export const readMealImagePreview = async/);
  assert.match(mealForm, /URL\.createObjectURL\(file\)/);
  assert.match(mealForm, /export const revokeMealImagePreview =/);
  assert.match(mealForm, /URL\.revokeObjectURL\(previewUrl\)/);
  assert.match(mealForm, /export const readMealImageDataUrl = async/);
  assert.match(mealForm, /export const toggleMealParticipant =/);
  assert.doesNotMatch(mealForm, /export const isLocalMealImagePreview =/);
  assert.equal(exists("lib/meal-form.ts"), false);

  assert.match(imagePolicy, /MAX_MEAL_IMAGE_UPLOAD_BYTES/);
  assert.match(imagePolicy, /ALLOWED_MEAL_IMAGE_TYPES/);
  assert.match(imagePolicy, /export const validateMealImageFile =/);
  assert.match(imagePolicy, /export const formatMealImageFileSize =/);
  assert.equal(exists("lib/meal-image-policy.ts"), false);

  assert.match(imageHook, /export const useMealImageSelection =/);
  assert.match(imageHook, /validateMealImageFile/);
  assert.match(imageHook, /readMealImagePreview/);
  assert.match(imageHook, /readMealImageDataUrl/);
  assert.match(imageHook, /revokeMealImagePreview/);
  assert.match(
    imageHook,
    /if \(nextValidationError\) \{\s*if \(imageFile\) \{\s*clearImage\(\);\s*\}\s*setValidationError\(nextValidationError\);/s
  );
  assert.match(imageHook, /warningMessage\?: string/);
  assert.match(imageHook, /setPreviewUnavailable\(true\)/);

  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/components\/MealImageField"/);
  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/components\/MealDetailsSection"/);
  assert.match(editPage, /from "@\/lib\/modules\/meals\/ui\/components\/MealImageField"/);
  assert.match(editPage, /from "@\/lib\/modules\/meals\/ui\/components\/MealDetailsSection"/);
  assert.match(addPage, /from "@\/lib\/modules\/meals\/ui\/useAddMealPageController"/);
  assert.match(editPage, /from "@\/lib\/modules\/meals\/ui\/useEditMealPageController"/);
  assert.match(addController, /from "@\/lib\/modules\/meals\/ui\/useMealImageSelection"/);
  assert.match(editController, /from "@\/lib\/modules\/meals\/ui\/useMealImageSelection"/);
  assert.match(mealImageField, /data-testid=\{inputTestId\}/);
  assert.match(mealImageField, /className="media-picker"/);
  assert.match(mealDetailsSection, /USER_ROLES\.map/);
  assert.match(mealDetailsSection, /VALID_MEAL_TYPES\.map/);
  assert.doesNotMatch(addPage, /new FileReader\(/);
  assert.doesNotMatch(editPage, /new FileReader\(/);
  assert.match(addController, /const imageSelection = useMealImageSelection\(\)/);
  assert.match(editController, /const imageSelection = useMealImageSelection\(\)/);
  assert.match(addController, /await imageSelection\.selectFile\(file\)/);
  assert.match(editController, /await imageSelection\.selectFile\(file\)/);
  assert.match(addController, /result\.warningMessage/);
  assert.match(editController, /result\.warningMessage/);
  assert.match(addController, /finally \{\s*if \(fileInputRef\.current\) \{\s*fileInputRef\.current\.value = "";/s);
  assert.match(editController, /finally \{\s*if \(fileInputRef\.current\) \{\s*fileInputRef\.current\.value = "";/s);
  assert.match(addController, /imageSelection\.clearImage\(\)/);
  assert.match(editController, /imageSelection\.clearImage\(\)/);
  assert.match(addPage, /controller\.imageSelection\.imagePreview/);
  assert.match(editPage, /controller\.imageSelection\.imagePreview/);
  assert.match(addPage, /controller\.imageSelection\.imageFile/);
  assert.match(editController, /imageSelection\.imageFile/);
  assert.match(addPage, /controller\.imageSelection\.validationError/);
  assert.match(editPage, /controller\.imageSelection\.validationError/);
  assert.match(
    editController,
    /imageSelection\.isLocalImage\s*\?\s*"미리보기를 표시하지 못했습니다\. 업로드 시 서버에서 변환을 시도합니다\."\s*:\s*"저장된 이미지를 표시하지 못했습니다\."/s
  );
  assert.doesNotMatch(addPage, /const imagePreviewRequestSequenceRef = useRef\(0\)/);
  assert.doesNotMatch(editPage, /const imagePreviewRequestSequenceRef = useRef\(0\)/);
  assert.match(mealEditorRuntime, /await uploadImage\(imageFile\)/);
  assert.match(mealEditorRuntime, /cleanupUploadedMealImage/);
  assert.match(mealEditorRuntime, /\.\.\.\(imageUrl !== undefined \? \{ imageUrl \} : \{\}\)/);
  assert.match(mealEditorRuntime, /readMealImageDataUrl\(imageFile\)/);
  assert.match(mealEditorService, /export const createMealRecord = async/);
  assert.match(mealEditorService, /export const updateExistingMealRecord = async/);
  assert.doesNotMatch(addPage, /const toggleUser =/);
  assert.doesNotMatch(editPage, /const toggleUser =/);

  assert.match(layout, /from "@\/lib\/config\/public-env"/);
  assert.match(firebase, /from "@\/lib\/config\/public-env"/);
  assert.doesNotMatch(layout, /@\/lib\/env/);
  assert.doesNotMatch(firebase, /@\/lib\/env/);
});

test("qa helpers are split by responsibility and meal card uses module ui controllers", () => {
  const qaMode = read("lib/qa/mode.ts");
  const qaFixtures = read("lib/qa/fixtures.ts");
  const qaSession = read("lib/qa/session.ts");
  const qaRuntime = read("lib/qa/runtime.ts");
  const qaMealsAdapter = read("lib/qa/adapters/meals.ts");
  const qaCommentsAdapter = read("lib/qa/adapters/comments.ts");
  const qaReactionsAdapter = read("lib/qa/adapters/reactions.ts");
  const qaProfileAdapter = read("lib/qa/adapters/profile.ts");
  const homePage = read("app/page.tsx");
  const homeController = read("lib/modules/meals/ui/useHomePageController.ts");
  const archivePage = read("app/archive/page.tsx");
  const archiveController = read("lib/modules/meals/ui/useArchivePageController.ts");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealDetailController = read("lib/modules/meals/ui/useMealDetailPageController.ts");
  const profileSessionProvider = read("lib/modules/profile/ui/UserSessionProvider.tsx");
  const userContext = read("context/UserContext.tsx");
  const mealCard = read(mealCardPath);
  const mealCommentService = read("lib/modules/comments/application/meal-comment-service.ts");
  const mealReactionService = read("lib/modules/reactions/application/meal-reaction-service.ts");
  const mealReadService = read("lib/modules/meals/application/meal-read-service.ts");
  const commentRuntime = read("lib/modules/comments/infrastructure/comment-runtime.ts");
  const reactionRuntime = read("lib/modules/reactions/infrastructure/reaction-runtime.ts");
  const mealReadRuntime = read("lib/modules/meals/infrastructure/meal-read-runtime.ts");
  const userSessionService = read("lib/modules/profile/application/user-session-service.ts");
  const userSessionRuntime = read("lib/modules/profile/infrastructure/user-session-runtime.ts");
  const qaBarrelPath = path.join(process.cwd(), "lib", "qa.ts");

  assert.equal(fs.existsSync(qaBarrelPath), false);
  assert.match(qaMode, /export const isQaMockMode =/);
  assert.match(qaFixtures, /export const createQaMockMeals =/);
  assert.match(qaSession, /export const getQaNotificationPreferences =/);
  assert.match(qaRuntime, /export const isQaRuntimeActive =/);
  assert.match(qaMealsAdapter, /export const isQaMealsRuntimeActive =/);
  assert.match(qaCommentsAdapter, /export const isQaCommentRuntimeActive =/);
  assert.match(qaReactionsAdapter, /export const isQaReactionRuntimeActive =/);
  assert.match(qaProfileAdapter, /export const isQaUserSessionRuntimeActive =/);

  assert.match(homePage, /from "@\/lib\/modules\/meals\/ui\/useHomePageController"/);
  assert.match(homeController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(archivePage, /from "@\/lib\/modules\/meals\/ui\/useArchivePageController"/);
  assert.match(archiveController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(mealDetailPage, /from "@\/lib\/modules\/meals\/ui\/useMealDetailPageController"/);
  assert.match(mealDetailController, /from "@\/lib\/modules\/meals\/application\/meal-read-service"/);
  assert.match(profileSessionProvider, /from "@\/lib\/modules\/profile\/application\/user-session-service"/);
  assert.match(userContext, /from "@\/lib\/modules\/profile\/ui\/UserSessionProvider"/);
  assert.match(mealCommentService, /from "@\/lib\/modules\/comments\/infrastructure\/comment-runtime"/);
  assert.match(mealReactionService, /from "@\/lib\/modules\/reactions\/infrastructure\/reaction-runtime"/);
  assert.match(mealReadService, /from "@\/lib\/modules\/meals\/infrastructure\/meal-read-runtime"/);
  assert.match(userSessionService, /from "@\/lib\/modules\/profile\/infrastructure\/user-session-runtime"/);
  assert.match(commentRuntime, /from "@\/lib\/qa\/adapters\/comments"/);
  assert.match(reactionRuntime, /from "@\/lib\/qa\/adapters\/reactions"/);
  assert.match(mealReadRuntime, /from "@\/lib\/qa\/adapters\/meals"/);
  assert.match(userSessionRuntime, /from "@\/lib\/qa\/adapters\/profile"/);
  assert.doesNotMatch(commentRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(reactionRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(mealReadRuntime, /from "@\/lib\/qa\/runtime"/);
  assert.doesNotMatch(userSessionRuntime, /from "@\/lib\/qa\/runtime"/);

  assert.match(mealCard, /from "@\/lib\/modules\/comments\/ui\/useMealCommentsController"/);
  assert.match(mealCard, /from "@\/lib\/modules\/reactions\/ui\/useMealReactionsController"/);
});
