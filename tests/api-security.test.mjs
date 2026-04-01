import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("server auth uses server-only allowlist and production fail-closed guard", () => {
  const serverAuth = read("lib/server-auth.ts");
  assert.match(serverAuth, /from "@\/lib\/config\/server-env"/);
  assert.match(serverAuth, /serverEnv\.allowedEmails/);
  assert.match(serverAuth, /Server allowlist is not configured/);
  assert.match(serverAuth, /assertAllowlistConfigured/);
  assert.doesNotMatch(serverAuth, /NEXT_PUBLIC_ALLOWED_EMAILS/);
});

test("comment creation route only requires authenticated role", () => {
  const commentRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentUseCases = read("lib/server/comments/comment-use-cases.ts");
  assert.match(commentRoute, /assertValidCommentRole/);
  assert.match(commentUseCases, /Valid user role is required/);
  assert.doesNotMatch(commentUseCases, /const canCommentOnMeal =/);
  assert.doesNotMatch(commentUseCases, /Meal participants must include your role/);
});

test("role updates are handled by server route with lock policy", () => {
  const roleRoute = read("app/api/profile/role/route.ts");
  assert.match(roleRoute, /allowRoleReassign/);
  assert.match(roleRoute, /Role is locked/);
  assert.match(roleRoute, /verifyRequestUser/);
});

test("firestore rules lock client-side role changes and validate optional fields", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /request\.resource\.data\.role == null/);
  assert.match(rules, /request\.resource\.data\.role == resource\.data\.role/);
  assert.match(rules, /function validImageUrl/);
  assert.match(rules, /function validKeywords/);
});

test("profile settings and activity logging stay on the server side", () => {
  const settingsRoute = read("app/api/profile/settings/route.ts");
  const activityLog = read("lib/activity-log.ts");
  const commentUseCases = read("lib/server/comments/comment-use-cases.ts");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");

  assert.match(settingsRoute, /verifyRequestUser/);
  assert.match(settingsRoute, /notificationPreferences/);
  assert.match(activityLog, /users"\)\.doc\(recipientUid\)\.collection\("activity"\)/);
  assert.match(commentUseCases, /createCommentActivities/);
  assert.match(mealReactionRoute, /syncMealReactionActivity/);
  assert.match(commentReactionRoute, /syncCommentReactionActivity/);
});

test("meal image uploads are handled by authenticated server route", () => {
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const uploadHelper = read("lib/uploadImage.ts");

  assert.match(uploadRoute, /verifyRequestUser/);
  assert.match(uploadRoute, /adminStorage/);
  assert.match(uploadRoute, /serverEnv\.storageBucket/);
  assert.match(uploadHelper, /\/api\/uploads\/meal-image/);
  assert.doesNotMatch(uploadHelper, /firebase\/storage/);
});

test("meal create and update mutations are handled by authenticated server APIs", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");
  const createRoute = read("app/api/meals/route.ts");
  const mealRoute = read("app/api/meals/[id]/route.ts");
  const serverMeals = read("lib/server-meals.ts");

  assert.match(mealMutations, /fetchAuthedJson<\{ ok: true; meal: Meal \}>\("\/api\/meals"/);
  assert.match(mealMutations, /\/api\/meals\/\$\{encodedMealId\}/);
  assert.match(createRoute, /verifyRequestUser/);
  assert.match(createRoute, /createMealDocument/);
  assert.match(mealRoute, /export async function PATCH/);
  assert.match(mealRoute, /updateMealDocument/);
  assert.match(serverMeals, /deleteStorageObjectByUrl/);
  assert.match(serverMeals, /buildMealKeywords/);
  assert.doesNotMatch(mealMutations, /await addDoc\(mealsRef/);
  assert.doesNotMatch(mealMutations, /await updateDoc\(mealRef/);
});

test("route handlers share common route error helpers", () => {
  const routeErrors = read("lib/route-errors.ts");
  const settingsRoute = read("app/api/profile/settings/route.ts");
  const roleRoute = read("app/api/profile/role/route.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const mealCommentsRoute = read("app/api/meals/[id]/comments/route.ts");
  const mealReactionsRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const commentReactionsRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");

  assert.match(routeErrors, /export class RouteError extends Error/);
  assert.match(routeErrors, /export const getRouteErrorStatus/);
  assert.match(routeErrors, /export const getRouteErrorMessage/);

  for (const source of [
    settingsRoute,
    roleRoute,
    uploadRoute,
    mealCommentsRoute,
    mealReactionsRoute,
    commentRoute,
    commentReactionsRoute,
  ]) {
    assert.match(source, /@\/lib\/route-errors/);
    assert.doesNotMatch(source, /class RouteError extends Error/);
    assert.doesNotMatch(source, /const getErrorStatus =/);
    assert.doesNotMatch(source, /const getErrorMessage =/);
  }
});

test("comment delete route no longer allows role-only legacy participant deletes", () => {
  const commentRoute = read("lib/server/comments/comment-use-cases.ts");

  assert.match(commentRoute, /const isOwner =/);
  assert.match(commentRoute, /const isAuthor =/);
  assert.doesNotMatch(commentRoute, /const isLegacyParticipant =/);
  assert.doesNotMatch(commentRoute, /isLegacyAllowed/);
});

test("client meal readers use explicit serialization and remove unused activity-feed builder", () => {
  const serializers = read("lib/client/serializers.ts");
  const clientMeals = read("lib/client/meals.ts");

  assert.match(serializers, /export const serializeMealSnapshot =/);
  assert.doesNotMatch(serializers, /return\s*\{\s*id:\s*docSnap\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.doesNotMatch(serializers, /return\s*\{\s*id:\s*snapshot\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.doesNotMatch(clientMeals, /export const buildActivityFeed =/);
});

test("comment count updates use atomic increments on create and guarded decrements on delete", () => {
  const commentUseCases = read("lib/server/comments/comment-use-cases.ts");

  assert.match(commentUseCases, /FieldValue\.increment\(1\)/);
  assert.doesNotMatch(commentUseCases, /commentCount:\s*baseCount \+ 1/);
  assert.match(commentUseCases, /commentCount:/);
});

test("server auth can reject non-allowlisted emails before full token verification", () => {
  const serverAuth = read("lib/server-auth.ts");

  assert.match(serverAuth, /decodeJwtPayload/);
  assert.match(serverAuth, /getUnverifiedEmailFromToken/);
  assert.match(serverAuth, /const unverifiedEmail = getUnverifiedEmailFromToken\(token\)/);
  assert.match(serverAuth, /if \(unverifiedEmail && !isAllowedEmail\(unverifiedEmail\)\)/);
  assert.match(serverAuth, /const decoded = await adminAuth\.verifyIdToken\(token, true\)/);
});

test("server config and meal policy are centralized in shared modules", () => {
  const publicEnv = read("lib/config/public-env.ts");
  const serverEnv = read("lib/config/server-env.ts");
  const env = read("lib/env.ts");
  const mealPolicy = read("lib/domain/meal-policy.ts");
  const firebaseAdmin = read("lib/firebase-admin.ts");
  const serverAuth = read("lib/server-auth.ts");
  const serverMeals = read("lib/server-meals.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const profilePage = read("app/profile/page.tsx");

  assert.match(publicEnv, /export const publicEnv/);
  assert.match(serverEnv, /export const serverEnv/);
  assert.match(env, /from "@\/lib\/config\/public-env"/);
  assert.match(mealPolicy, /export const USER_ROLES/);
  assert.match(mealPolicy, /export const VALID_MEAL_TYPES/);
  assert.match(mealPolicy, /export const MAX_MEAL_DESCRIPTION_LENGTH/);

  assert.match(firebaseAdmin, /from "@\/lib\/config\/server-env"/);
  assert.match(serverAuth, /from "@\/lib\/config\/server-env"/);
  assert.match(serverMeals, /from "@\/lib\/config\/server-env"/);
  assert.match(serverMeals, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(uploadRoute, /from "@\/lib\/config\/server-env"/);
  assert.match(profilePage, /from "@\/lib\/client\/profile"/);

  assert.doesNotMatch(firebaseAdmin, /process\.env\.NEXT_PUBLIC_FIREBASE_PROJECT_ID/);
  assert.doesNotMatch(serverMeals, /const VALID_MEAL_TYPES:/);
  assert.doesNotMatch(serverMeals, /const VALID_ROLES:/);
});

test("comment routes delegate to extracted server use cases", () => {
  const commentCreateRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentMutationRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const commentUseCases = read("lib/server/comments/comment-use-cases.ts");
  const commentPolicy = read("lib/server/comments/comment-policy.ts");

  assert.match(commentCreateRoute, /from "@\/lib\/server\/comments\/comment-use-cases"/);
  assert.match(commentMutationRoute, /from "@\/lib\/server\/comments\/comment-use-cases"/);
  assert.match(commentUseCases, /export const createMealComment = async/);
  assert.match(commentUseCases, /export const updateMealCommentById = async/);
  assert.match(commentUseCases, /export const deleteMealCommentById = async/);
  assert.match(commentPolicy, /export const CommentCreateSchema/);
  assert.match(commentPolicy, /export const CommentUpdateSchema/);
  assert.doesNotMatch(commentCreateRoute, /adminDb\.runTransaction/);
  assert.doesNotMatch(commentMutationRoute, /adminDb\.runTransaction/);
});

test("shared meal policy constants are reused across routes and draft helpers", () => {
  const mealDraft = read("lib/meal-draft.ts");
  const mealCreateRoute = read("app/api/meals/route.ts");
  const mealUpdateRoute = read("app/api/meals/[id]/route.ts");
  const roleRoute = read("app/api/profile/role/route.ts");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");

  assert.match(mealDraft, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(mealCreateRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(mealUpdateRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(roleRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(mealReactionRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(commentReactionRoute, /from "@\/lib\/domain\/meal-policy"/);

  assert.doesNotMatch(mealDraft, /const VALID_TYPES =/);
  assert.doesNotMatch(mealDraft, /const VALID_USERS =/);
  assert.doesNotMatch(mealCreateRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(mealCreateRoute, /const VALID_MEAL_TYPES = \["아침"/);
  assert.doesNotMatch(mealUpdateRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(mealUpdateRoute, /const VALID_MEAL_TYPES = \["아침"/);
  assert.doesNotMatch(roleRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(mealReactionRoute, /new Set\(\["아빠"/);
  assert.doesNotMatch(commentReactionRoute, /new Set\(\["아빠"/);
});

test("meal client access is split into query, mutation, and filtering modules", () => {
  const mealsBarrel = read("lib/client/meals.ts");
  const mealQueries = read("lib/client/meal-queries.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealFilters = read("lib/client/meal-filters.ts");

  assert.match(mealsBarrel, /from "@\/lib\/client\/meal-queries"/);
  assert.match(mealsBarrel, /from "@\/lib\/client\/meal-mutations"/);
  assert.match(mealsBarrel, /from "@\/lib\/client\/meal-filters"/);

  assert.match(mealQueries, /export const getMealsForDate = async/);
  assert.match(mealQueries, /export const getRecentMeals = async/);
  assert.match(mealQueries, /export const subscribeMealsForDate =/);
  assert.match(mealQueries, /export const searchMeals = async/);
  assert.match(mealQueries, /export const getWeeklyStats = async/);

  assert.match(mealMutations, /export const addMeal = async/);
  assert.match(mealMutations, /export const updateMeal = async/);
  assert.match(mealMutations, /export const deleteMeal = async/);

  assert.match(mealFilters, /export const filterAndSortMeals =/);
  assert.match(mealFilters, /export const getMealCommentCount =/);

  assert.doesNotMatch(mealsBarrel, /const getDayRange =/);
  assert.doesNotMatch(mealsBarrel, /const deriveMealMetrics =/);
});
