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
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
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
  assert.match(addPage, /className="input-base textarea-base"/);
  assert.match(editPage, /className="input-base textarea-base[^"]*"/);
});

test("login view uses the refreshed onboarding layout and shared CSS hooks", () => {
  const loginView = read("components/LoginView.tsx");
  const layoutStyles = read("app/styles/layout.css");

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
});

test("update banner is wired into root layout", () => {
  const layout = read("app/layout.tsx");
  const cleanup = read("components/ServiceWorkerCleanup.tsx");
  const errorMonitor = read("components/ClientErrorMonitor.tsx");
  assert.match(layout, /import dynamic from "next\/dynamic"/);
  assert.match(layout, /import ClientErrorMonitor from "@\/components\/ClientErrorMonitor"/);
  assert.match(layout, /import ServiceWorkerCleanup from "@\/components\/ServiceWorkerCleanup"/);
  assert.match(layout, /const AppUpdateBanner = dynamic\(\(\) => import\("@\/components\/AppUpdateBanner"\)\)/);
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
  assert.match(errorMonitor, /navigator\.sendBeacon/);
  assert.match(errorMonitor, /window\.addEventListener\("error"/);
  assert.match(errorMonitor, /window\.addEventListener\("unhandledrejection"/);
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
  const qaAccess = read("lib/qa-access.ts");
  assert.match(proxy, /QA_ROUTE_TOKEN/);
  assert.match(proxy, /qa_token/);
  assert.match(proxy, /x-qa-token/);
  assert.match(proxy, /matcher:\s*\["\/qa\/:path\*"\]/);
  assert.match(proxy, /canAccessQaRoute/);
  assert.match(qaAccess, /if \(!qaRouteToken\)\s*{\s*return false;\s*}/);
});

test("comment mutations are handled by server APIs and update parent commentCount", () => {
  const clientComments = read("lib/client/comments.ts");
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const deleteRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");

  assert.match(clientComments, /\/api\/meals\/\$\{encodedMealId\}\/comments/);
  assert.match(clientComments, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}/);
  assert.doesNotMatch(clientComments, /runTransaction\(/);
  assert.match(createRoute, /createMealComment/);
  assert.match(deleteRoute, /deleteMealCommentById/);
});

test("reaction mutations are handled by dedicated APIs with shared validation", () => {
  const clientReactions = read("lib/client/reactions.ts");
  const reactionBar = read("components/ReactionBar.tsx");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const reactionHelpers = read("lib/reactions.ts");

  assert.match(clientReactions, /\/api\/meals\/\$\{encodedMealId\}\/reactions/);
  assert.match(clientReactions, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}\/reactions/);
  assert.match(reactionBar, /data-testid=\{`\$\{scope\}-reaction-chip-\$\{option\.key\}`\}/);
  assert.match(mealReactionRoute, /ALLOWED_REACTION_EMOJIS/);
  assert.match(commentReactionRoute, /ALLOWED_REACTION_EMOJIS/);
  assert.match(reactionHelpers, /export const ALLOWED_REACTION_EMOJIS/);
});

test("comment routes support replies and safe parent deletion guards", () => {
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentUseCases = read("lib/server/comments/comment-use-cases.ts");
  const mealCard = read("components/MealCard.tsx");
  const mealConversationPanel = read("components/meal-detail/MealConversationPanel.tsx");
  const commentItem = read("components/comments/CommentItem.tsx");
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const homePage = read("app/page.tsx");
  const filterChips = read("components/FilterChips.tsx");
  const archivePage = read("app/archive/page.tsx");
  const activitySummaryPath = path.join(process.cwd(), "components", "ActivitySummary.tsx");

  assert.match(createRoute, /parentId/);
  assert.match(commentUseCases, /mentionedAuthor/);
  assert.match(commentUseCases, /where\("parentId", "==", commentId\)/);
  assert.match(commentUseCases, /Reply comments exist/);
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
  const mealPreviewCard = read("components/MealPreviewCard.tsx");
  const navbar = read("components/Navbar.tsx");
  const weekDateStrip = read("components/WeekDateStrip.tsx");
  const commentThread = read("components/comments/CommentThread.tsx");
  const commentItem = read("components/comments/CommentItem.tsx");
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealPhotoStage = read("components/meal-detail/MealPhotoStage.tsx");
  const mealDetailSummary = read("components/meal-detail/MealDetailSummary.tsx");
  const mealConversationPanel = read("components/meal-detail/MealConversationPanel.tsx");

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

test("meal card uses extracted hooks, shared comment subscription store, and shared time formatting", () => {
  const mealCard = read("components/MealCard.tsx");
  const mealCommentsHook = read("lib/features/comments/ui/useMealCommentsController.ts");
  const mealReactionsHook = read("lib/features/reactions/ui/useMealReactionsController.ts");
  const commentsStore = read("lib/meal-comments-store.ts");
  const timeUtils = read("lib/time.ts");
  const commentItem = read("components/comments/CommentItem.tsx");
  const commentThread = read("components/comments/CommentThread.tsx");
  const conversationPanel = read("components/meal-detail/MealConversationPanel.tsx");

  assert.match(mealCard, /useMealComments/);
  assert.match(mealCard, /useMealReactions/);
  assert.match(mealCard, /const \[commentsOpen, setCommentsOpen\] = useState\(true\)/);
  assert.doesNotMatch(mealCard, /subscribeMealComments/);
  assert.doesNotMatch(mealCard, /const formatRelativeTime =/);

  assert.match(mealCommentsHook, /subscribeToMealComments/);
  assert.match(mealCommentsHook, /useMealCommentsController/);
  assert.match(mealReactionsHook, /useMealReactionsController/);
  assert.match(commentsStore, /const commentEntries = new Map/);
  assert.match(commentsStore, /refCount/);
  assert.match(timeUtils, /export const formatRelativeTime =/);

  assert.match(commentItem, /from "@\/lib\/time"/);
  assert.match(commentThread, /from "@\/lib\/types"/);
  assert.doesNotMatch(commentItem, /formatRelativeTime:/);
  assert.doesNotMatch(conversationPanel, /formatRelativeTime:/);
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
  const confirmDialog = read("components/ConfirmDialog.tsx");
  const toast = read("components/Toast.tsx");
  const layoutStyles = read("app/styles/layout.css");

  assert.match(confirmDialog, /confirm-overlay/);
  assert.match(confirmDialog, /confirm-dialog/);
  assert.match(confirmDialog, /confirm-actions/);
  assert.doesNotMatch(confirmDialog, /style=\{\{/);

  assert.match(toast, /toast-viewport/);
  assert.match(toast, /toast-item/);
  assert.doesNotMatch(toast, /style=\{\{/);

  assert.match(layoutStyles, /\.confirm-overlay\s*\{/);
  assert.match(layoutStyles, /\.toast-viewport\s*\{/);
  assert.match(layoutStyles, /\.toast-item-visible\s*\{/);
});

test("next config is kept minimal and avoids placeholder comments", () => {
  const nextConfig = read("next.config.ts");

  assert.doesNotMatch(nextConfig, /config options here/);
  assert.match(nextConfig, /withPWA\(nextConfig\)/);
});

test("default build script preserves cache and exposes explicit clean build", () => {
  const packageJson = read("package.json");

  assert.match(packageJson, /"build":\s*"next build --webpack"/);
  assert.match(packageJson, /"build:clean":\s*"node scripts\/clean-next-dir\.mjs && next build --webpack"/);
  assert.doesNotMatch(packageJson, /"build":\s*"node scripts\/clean-next-dir\.mjs/);
});

test("archive search defers remote querying until input settles", () => {
  const archivePage = read("app/archive/page.tsx");

  assert.match(archivePage, /useDeferredValue/);
  assert.match(archivePage, /deferredQuery/);
  assert.match(archivePage, /query\.trim\(\)/);
  assert.match(archivePage, /searchMeals\(deferredQuery\)/);
  assert.match(archivePage, /requestSequenceRef/);
  assert.match(archivePage, /requestId !== requestSequenceRef\.current/);
  assert.match(archivePage, /let active = true/);
});

test("client error route lazy-loads Upstash only when credentials exist", () => {
  const clientErrorsRoute = read("app/api/client-errors/route.ts");

  assert.doesNotMatch(clientErrorsRoute, /^import \{ Ratelimit \} from "@upstash\/ratelimit";/m);
  assert.doesNotMatch(clientErrorsRoute, /^import \{ Redis \} from "@upstash\/redis";/m);
  assert.match(clientErrorsRoute, /import\("@upstash\/ratelimit"\)/);
  assert.match(clientErrorsRoute, /import\("@upstash\/redis"\)/);
  assert.match(clientErrorsRoute, /getUpstashLimiter/);
});

test("qa fixtures use readable Korean literals in source", () => {
  const qa = read("lib/qa/fixtures.ts");

  assert.match(qa, /테스트용 식사 기록입니다\./);
  assert.match(qa, /댓글 입력 가독성 테스트/);
  assert.doesNotMatch(qa, /\\uD14C\\uC2A4\\uD2B8/);
});

test("home page delegates date, meals, and weekly stats state to focused hooks", () => {
  const homePage = read("app/page.tsx");
  const selectedDateHook = read("components/hooks/useSelectedDate.ts");
  const mealsHook = read("lib/features/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/features/meals/ui/useWeeklyStatsController.ts");
  const lazyCalendar = read("components/LazyCalendar.tsx");

  assert.match(homePage, /import dynamic from "next\/dynamic"/);
  assert.match(homePage, /useSelectedDate/);
  assert.match(homePage, /useMealsForDate/);
  assert.match(homePage, /useWeeklyStats/);
  assert.match(homePage, /const LazyCalendar = dynamic\(\(\) => import\("@\/components\/LazyCalendar"\)\)/);
  assert.match(homePage, /<LazyCalendar onChange=\{onDateChange\} value=\{effectiveSelectedDate\} locale="ko-KR" \/>/);
  assert.doesNotMatch(homePage, /import Calendar from "react-calendar"/);
  assert.doesNotMatch(homePage, /react-calendar\/dist\/Calendar\.css/);
  assert.doesNotMatch(homePage, /const \[remoteMeals, setRemoteMeals\]/);
  assert.doesNotMatch(homePage, /const \[remoteWeeklyStats, setRemoteWeeklyStats\]/);
  assert.doesNotMatch(homePage, /const \[selectedDate, setSelectedDate\]/);

  assert.match(selectedDateHook, /export const useSelectedDate =/);
  assert.match(mealsHook, /export const useMealsForDateController =/);
  assert.match(weeklyStatsHook, /export const useWeeklyStatsController =/);
  assert.match(weeklyStatsHook, /getWeeklyStats/);
  assert.match(lazyCalendar, /import Calendar from "react-calendar"/);
  assert.match(lazyCalendar, /react-calendar\/dist\/Calendar\.css/);
});

test("date-driven hooks clear stale meal state and cache weekly stats by week", () => {
  const mealsHook = read("lib/features/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/features/meals/ui/useWeeklyStatsController.ts");
  const mealQueries = read("lib/client/meal-queries.ts");
  const mealFilters = read("lib/client/meal-filters.ts");

  assert.match(mealsHook, /setRemoteMeals\(\[\]\)/);
  assert.match(mealsHook, /loadedDateKey === currentDateKey/);
  assert.match(weeklyStatsHook, /weeklyStatsCache/);
  assert.match(weeklyStatsHook, /weekKey/);
  assert.match(weeklyStatsHook, /const cachedWeekStats = weeklyStatsCache\[weekKey\]/);
  assert.match(weeklyStatsHook, /if \(cachedWeekStats\)/);
  assert.doesNotMatch(weeklyStatsHook, /\[effectiveSelectedDate, qaMode, role, weekKey, weeklyStatsCache\]/);
  assert.match(mealQueries, /serializeWeeklyStatMealSnapshot/);
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
  const clientErrorsRoute = read("app/api/client-errors/route.ts");

  assert.match(clientErrorsRoute, /const validateContentLengthHeader = \(request: Request\): NextResponse \| null =>/);
  assert.match(clientErrorsRoute, /const tooLargeHeaderResponse = validateContentLengthHeader\(request\);/);
  assert.match(clientErrorsRoute, /if \(tooLargeHeaderResponse\) return tooLargeHeaderResponse;/);
  assert.match(clientErrorsRoute, /const validateBodyByteLength = \(body: string\): NextResponse \| null =>/);
  assert.match(clientErrorsRoute, /const tooLargeBodyResponse = validateBodyByteLength\(raw\);/);
});

test("update polling only runs when a service worker registration is available", () => {
  const updateBanner = read("components/AppUpdateBanner.tsx");

  assert.match(updateBanner, /if \(!registration\) return;/);
  assert.match(updateBanner, /await setupServiceWorker\(\);/);
  assert.match(updateBanner, /if \(registration\) \{/);
  assert.match(updateBanner, /window\.setInterval/);
  assert.doesNotMatch(updateBanner, /void checkForUpdate\(\);\s*\n\s*intervalId = window\.setInterval/);
});

test("persistent activity feed and profile notification settings are wired", () => {
  const types = read("lib/types.ts");
  const clientActivity = read("lib/client/activity.ts");
  const activityFeed = read("components/ActivityFeed.tsx");
  const profilePage = read("app/profile/page.tsx");
  const userContext = read("context/UserContext.tsx");

  assert.match(types, /notificationPreferences/);
  assert.match(types, /ActivityFeedItem/);
  assert.match(clientActivity, /subscribeUserActivity/);
  assert.match(clientActivity, /markAllActivitiesRead/);
  assert.match(activityFeed, /activity-mark-all-read/);
  assert.match(profilePage, /profile-notification-toggle-browserEnabled/);
  assert.match(profilePage, /profile-notification-toggle-reactionAlerts/);
  assert.match(userContext, /updateNotificationPreferences/);
});

test("add flow remembers recent meal draft defaults", () => {
  const addPage = read("app/add/page.tsx");
  const mealDraft = read("lib/meal-draft.ts");
  const mealCopy = read("lib/meal-copy.ts");
  const mealErrors = read("lib/meal-errors.ts");
  const homePage = read("app/page.tsx");
  const selectedDateHook = read("components/hooks/useSelectedDate.ts");
  const uploadHelper = read("lib/uploadImage.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");

  assert.match(addPage, /getMealDraftDefaults/);
  assert.match(addPage, /saveMealDraftDefaults/);
  assert.match(addPage, /buildAutoMealDescription/);
  assert.match(addPage, /data-testid="add-photo-input"/);
  assert.match(addPage, /data-testid="add-quick-save"/);
  assert.match(addPage, /uploadImage/);
  assert.match(addPage, /toMealCreateErrorMessage/);
  assert.match(mealErrors, /사진 업로드에 실패했습니다\./);
  assert.match(mealErrors, /식사 기록 저장에 실패했습니다\./);
  assert.match(homePage, /useSelectedDate/);
  assert.match(selectedDateHook, /useSearchParams/);
  assert.match(mealDraft, /localStorage/);
  assert.match(mealDraft, /mealType/);
  assert.match(mealDraft, /participantIds/);
  assert.match(mealCopy, /buildAutoMealDescription/);
  assert.match(uploadHelper, /Authorization/);
  assert.match(uploadHelper, /\/api\/uploads\/meal-image/);
  assert.match(mealMutations, /\/api\/meals/);
});

test("edit flow uses server mutation helper and specific failure copy", () => {
  const editPage = read("app/edit/[id]/page.tsx");
  const mealErrors = read("lib/meal-errors.ts");

  assert.match(editPage, /toMealUpdateErrorMessage/);
  assert.match(mealErrors, /사진 업로드에 실패했습니다\./);
  assert.match(mealErrors, /식사 기록 수정에 실패했습니다\./);
});

test("meal delete route uses idempotent server cleanup flow", () => {
  const deleteRoute = read("app/api/meals/[id]/route.ts");
  const mealUseCases = read("lib/server/meals/meal-use-cases.ts");
  assert.match(deleteRoute, /planMealDeleteOperation/);
  assert.match(deleteRoute, /deleteMealCommentsByMealId/);
  assert.match(deleteRoute, /markMealDeleteJob/);
  assert.match(mealUseCases, /_maintenanceDeleteJobs/);
  assert.match(mealUseCases, /status:\s*"processing"/);
  assert.match(deleteRoute, /status:\s*"completed"/);
  assert.match(deleteRoute, /status:\s*"failed"/);
  assert.match(mealUseCases, /deleteMealCommentsByMealId/);
});

test("qa mock mode is disabled in production by env guard", () => {
  const qaLib = read("lib/qa/mode.ts");
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

test("client data access is split into focused adapters and user context delegates profile I/O", () => {
  const clientData = read("lib/data.ts");
  const clientHttp = read("lib/client/http.ts");
  const clientMeals = read("lib/client/meal-queries.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealFilters = read("lib/client/meal-filters.ts");
  const clientComments = read("lib/client/comments.ts");
  const clientReactions = read("lib/client/reactions.ts");
  const clientActivity = read("lib/client/activity.ts");
  const clientProfile = read("lib/client/profile.ts");
  const profileSession = read("lib/client/profile-session.ts");
  const authHttp = read("lib/client/auth-http.ts");
  const mealCommentsHook = read("lib/features/comments/ui/useMealCommentsController.ts");
  const mealReactionsHook = read("lib/features/reactions/ui/useMealReactionsController.ts");
  const mealsHook = read("lib/features/meals/ui/useMealsForDateController.ts");
  const weeklyStatsHook = read("lib/features/meals/ui/useWeeklyStatsController.ts");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const mealCard = read("components/MealCard.tsx");
  const profilePage = read("app/profile/page.tsx");
  const userContext = read("context/UserContext.tsx");

  assert.match(clientHttp, /export const fetchAuthedJson = async/);
  assert.match(clientMeals, /export const getMealsForDate = async/);
  assert.match(clientMeals, /export const getMealById = async/);
  assert.match(mealMutations, /export const addMeal = async/);
  assert.match(mealMutations, /export const updateMeal = async/);
  assert.match(mealFilters, /export const filterAndSortMeals =/);
  assert.match(clientComments, /export const addMealComment = async/);
  assert.match(clientComments, /export const updateMealComment = async/);
  assert.match(clientComments, /export const deleteMealComment = async/);
  assert.match(clientReactions, /export const toggleMealReaction = async/);
  assert.match(clientReactions, /export const toggleMealCommentReaction = async/);
  assert.match(clientActivity, /export const updateNotificationPreferences = async/);
  assert.match(clientProfile, /export const users =/);
  assert.match(profileSession, /export const loadUserProfile = async/);
  assert.match(profileSession, /export const saveUserRole = async/);
  assert.match(authHttp, /export const getAccessToken = async/);
  assert.match(authHttp, /export const parseErrorMessage = async/);

  assert.match(clientData, /from "@\/lib\/client\/meals"/);
  assert.match(clientData, /from "@\/lib\/client\/comments"/);
  assert.match(clientData, /from "@\/lib\/client\/reactions"/);
  assert.match(clientData, /from "@\/lib\/client\/activity"/);

  assert.match(mealCommentsHook, /from "@\/lib\/client\/comments"/);
  assert.match(mealReactionsHook, /from "@\/lib\/client\/reactions"/);
  assert.match(mealsHook, /from "@\/lib\/client\/meals"/);
  assert.match(weeklyStatsHook, /from "@\/lib\/client\/meals"/);
  assert.match(archivePage, /from "@\/lib\/client\/meals"/);
  assert.match(mealDetailPage, /from "@\/lib\/client\/meals"/);
  assert.match(mealCard, /from "@\/lib\/client\/meals"/);
  assert.match(profilePage, /from "@\/lib\/client\/profile"/);
  assert.match(userContext, /from "@\/lib\/client\/profile-session"/);
  assert.match(userContext, /from "@\/lib\/client\/activity"/);
  assert.doesNotMatch(userContext, /doc, getDoc/);
});

test("meal date hooks are routed through feature ui controllers and upload helper reuses shared auth http", () => {
  const homePage = read("app/page.tsx");
  const mealsHookCompat = read("components/hooks/useMealsForDate.ts");
  const weeklyStatsHookCompat = read("components/hooks/useWeeklyStats.ts");
  const mealsController = read("lib/features/meals/ui/useMealsForDateController.ts");
  const weeklyStatsController = read("lib/features/meals/ui/useWeeklyStatsController.ts");
  const uploadHelper = read("lib/uploadImage.ts");

  assert.match(homePage, /from "@\/lib\/features\/meals\/ui\/useMealsForDateController"/);
  assert.match(homePage, /from "@\/lib\/features\/meals\/ui\/useWeeklyStatsController"/);
  assert.doesNotMatch(homePage, /@\/components\/hooks\/useMealsForDate/);
  assert.doesNotMatch(homePage, /@\/components\/hooks\/useWeeklyStats/);
  assert.match(mealsHookCompat, /useMealsForDateController as useMealsForDate/);
  assert.match(weeklyStatsHookCompat, /useWeeklyStatsController as useWeeklyStats/);
  assert.match(mealsController, /export const useMealsForDateController =/);
  assert.match(weeklyStatsController, /export const useWeeklyStatsController =/);

  assert.match(uploadHelper, /from "@\/lib\/client\/auth-http"/);
  assert.doesNotMatch(uploadHelper, /const getAccessToken = async/);
  assert.doesNotMatch(uploadHelper, /const parseErrorMessage = async/);
});

test("runtime pages avoid compat meal barrel and comment store reuses shared serializers", () => {
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
  const commentsStore = read("lib/meal-comments-store.ts");

  assert.match(addPage, /from "@\/lib\/client\/meals"/);
  assert.match(editPage, /from "@\/lib\/client\/meals"/);
  assert.doesNotMatch(addPage, /@\/lib\/data/);
  assert.doesNotMatch(editPage, /@\/lib\/data/);

  assert.match(commentsStore, /from "@\/lib\/client\/serializers"/);
  assert.doesNotMatch(commentsStore, /const normalizeComment =/);
  assert.doesNotMatch(commentsStore, /const convertCommentDoc =/);
});

test("meal editor pages reuse focused meal form helpers and direct public env config", () => {
  const addPage = read("app/add/page.tsx");
  const editPage = read("app/edit/[id]/page.tsx");
  const mealForm = read("lib/meal-form.ts");
  const layout = read("app/layout.tsx");
  const firebase = read("lib/firebase.ts");

  assert.match(mealForm, /export const readMealImagePreview = async/);
  assert.match(mealForm, /export const toggleMealParticipant =/);
  assert.match(mealForm, /export const isLocalMealImagePreview =/);

  assert.match(addPage, /from "@\/lib\/meal-form"/);
  assert.match(editPage, /from "@\/lib\/meal-form"/);
  assert.doesNotMatch(addPage, /new FileReader\(/);
  assert.doesNotMatch(editPage, /new FileReader\(/);
  assert.doesNotMatch(addPage, /const toggleUser =/);
  assert.doesNotMatch(editPage, /const toggleUser =/);

  assert.match(layout, /from "@\/lib\/config\/public-env"/);
  assert.match(firebase, /from "@\/lib\/config\/public-env"/);
  assert.doesNotMatch(layout, /@\/lib\/env/);
  assert.doesNotMatch(firebase, /@\/lib\/env/);
});

test("qa helpers are split by responsibility and meal card uses feature ui controllers", () => {
  const qaBarrel = read("lib/qa.ts");
  const qaMode = read("lib/qa/mode.ts");
  const qaFixtures = read("lib/qa/fixtures.ts");
  const qaSession = read("lib/qa/session.ts");
  const homePage = read("app/page.tsx");
  const archivePage = read("app/archive/page.tsx");
  const mealDetailPage = read("app/meals/[id]/page.tsx");
  const userContext = read("context/UserContext.tsx");
  const mealCard = read("components/MealCard.tsx");

  assert.match(qaBarrel, /from "@\/lib\/qa\/mode"/);
  assert.match(qaBarrel, /from "@\/lib\/qa\/fixtures"/);
  assert.match(qaBarrel, /from "@\/lib\/qa\/session"/);
  assert.match(qaMode, /export const isQaMockMode =/);
  assert.match(qaFixtures, /export const createQaMockMeals =/);
  assert.match(qaSession, /export const getQaNotificationPreferences =/);

  assert.match(homePage, /from "@\/lib\/qa\/mode"/);
  assert.match(archivePage, /from "@\/lib\/qa\/fixtures"/);
  assert.match(mealDetailPage, /from "@\/lib\/qa\/fixtures"/);
  assert.match(userContext, /from "@\/lib\/qa\/session"/);

  assert.match(mealCard, /from "@\/lib\/features\/comments\/ui\/useMealCommentsController"/);
  assert.match(mealCard, /from "@\/lib\/features\/reactions\/ui\/useMealReactionsController"/);
});
