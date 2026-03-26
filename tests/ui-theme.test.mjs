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
  const qaAccess = read("lib/qa-access.ts");
  assert.match(proxy, /QA_ROUTE_TOKEN/);
  assert.match(proxy, /qa_token/);
  assert.match(proxy, /x-qa-token/);
  assert.match(proxy, /matcher:\s*\["\/qa\/:path\*"\]/);
  assert.match(proxy, /canAccessQaRoute/);
  assert.match(qaAccess, /if \(!qaRouteToken\)\s*{\s*return false;\s*}/);
});

test("comment mutations are handled by server APIs and update parent commentCount", () => {
  const clientData = read("lib/data.ts");
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const deleteRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");

  assert.match(clientData, /\/api\/meals\/\$\{encodedMealId\}\/comments/);
  assert.match(clientData, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}/);
  assert.doesNotMatch(clientData, /runTransaction\(/);
  assert.match(createRoute, /commentCount:\s*baseCount \+ 1/);
  assert.match(deleteRoute, /commentCount:\s*Math\.max\(0,\s*baseCount - 1\)/);
});

test("reaction mutations are handled by dedicated APIs with shared validation", () => {
  const clientData = read("lib/data.ts");
  const reactionBar = read("components/ReactionBar.tsx");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const reactionHelpers = read("lib/reactions.ts");

  assert.match(clientData, /\/api\/meals\/\$\{encodedMealId\}\/reactions/);
  assert.match(clientData, /\/api\/meals\/\$\{encodedMealId\}\/comments\/\$\{encodedCommentId\}\/reactions/);
  assert.match(reactionBar, /data-testid=\{`\$\{scope\}-reaction-chip-\$\{option\.key\}`\}/);
  assert.match(mealReactionRoute, /ALLOWED_REACTION_EMOJIS/);
  assert.match(commentReactionRoute, /ALLOWED_REACTION_EMOJIS/);
  assert.match(reactionHelpers, /export const ALLOWED_REACTION_EMOJIS/);
});

test("comment routes support replies and safe parent deletion guards", () => {
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const updateDeleteRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const mealCard = read("components/MealCard.tsx");
  const mealConversationPanel = read("components/meal-detail/MealConversationPanel.tsx");
  const commentItem = read("components/comments/CommentItem.tsx");
  const commentComposer = read("components/comments/CommentComposer.tsx");
  const homePage = read("app/page.tsx");
  const activitySummary = read("components/ActivitySummary.tsx");
  const filterChips = read("components/FilterChips.tsx");
  const archivePage = read("app/archive/page.tsx");

  assert.match(createRoute, /parentId/);
  assert.match(createRoute, /mentionedAuthor/);
  assert.match(updateDeleteRoute, /where\("parentId", "==", commentId\)/);
  assert.match(updateDeleteRoute, /Reply comments exist/);
  assert.match(mealCard, /MealConversationPanel/);
  assert.match(mealConversationPanel, /CommentThread/);
  assert.match(commentItem, /comment-reply-button-/);
  assert.match(commentComposer, /comment-reply-target/);
  assert.match(filterChips, /data-testid=\{`\$\{testIdPrefix\}-\$\{option\}`\}/);
  assert.match(activitySummary, /activity-summary-card-\$\{item\.key\}/);
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

test("persistent activity feed and profile notification settings are wired", () => {
  const types = read("lib/types.ts");
  const data = read("lib/data.ts");
  const activityFeed = read("components/ActivityFeed.tsx");
  const profilePage = read("app/profile/page.tsx");
  const userContext = read("context/UserContext.tsx");

  assert.match(types, /notificationPreferences/);
  assert.match(types, /ActivityFeedItem/);
  assert.match(data, /subscribeUserActivity/);
  assert.match(data, /markAllActivitiesRead/);
  assert.match(data, /minimumReactions/);
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
  const uploadHelper = read("lib/uploadImage.ts");
  const data = read("lib/data.ts");

  assert.match(addPage, /getMealDraftDefaults/);
  assert.match(addPage, /saveMealDraftDefaults/);
  assert.match(addPage, /buildAutoMealDescription/);
  assert.match(addPage, /data-testid="add-photo-input"/);
  assert.match(addPage, /data-testid="add-quick-save"/);
  assert.match(addPage, /uploadImage/);
  assert.match(addPage, /toMealCreateErrorMessage/);
  assert.match(mealErrors, /사진 업로드에 실패했습니다\./);
  assert.match(mealErrors, /식사 기록 저장에 실패했습니다\./);
  assert.match(homePage, /useSearchParams/);
  assert.match(mealDraft, /localStorage/);
  assert.match(mealDraft, /mealType/);
  assert.match(mealDraft, /participantIds/);
  assert.match(mealCopy, /buildAutoMealDescription/);
  assert.match(uploadHelper, /Authorization/);
  assert.match(uploadHelper, /\/api\/uploads\/meal-image/);
  assert.match(data, /\/api\/meals/);
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
  assert.match(deleteRoute, /_maintenanceDeleteJobs/);
  assert.match(deleteRoute, /status:\s*"processing"/);
  assert.match(deleteRoute, /status:\s*"completed"/);
  assert.match(deleteRoute, /status:\s*"failed"/);
  assert.match(deleteRoute, /deleteMealComments/);
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
