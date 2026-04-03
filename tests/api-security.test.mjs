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
  assert.doesNotMatch(rules, /isLegacyMeal\(resource\.data\) && isMealParticipant\(resource\.data\)/);
  assert.match(rules, /isLegacyMeal\(mealData\) && mealData\.userId is string && mealData\.userId == currentUserRole\(\)/);
  assert.match(rules, /resource\.data\.ownerUid is string/);
  assert.match(rules, /!\('userId' in request\.resource\.data\)/);
  assert.match(rules, /!changedKeys\.hasAny\(\['ownerUid', 'commentCount', 'reactions', 'userId'\]\)/);
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

test("meal image uploads no longer accept caller-controlled storage paths", () => {
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const uploadHelper = read("lib/uploadImage.ts");

  assert.doesNotMatch(uploadRoute, /path:\s*z\.string/);
  assert.match(uploadRoute, /return `meals\/\$\{uid\}\/\$\{Date\.now\(\)\}_\$\{randomUUID\(\)\}\.\$\{extension\}`/);
  assert.doesNotMatch(uploadRoute, /requestedPath/);
  assert.doesNotMatch(uploadHelper, /path\?: string/);
  assert.doesNotMatch(uploadHelper, /JSON\.stringify\(\{ imageData, path \}\)/);
});

test("meal routes delegate to extracted server meal modules", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");
  const createRoute = read("app/api/meals/route.ts");
  const mealRoute = read("app/api/meals/[id]/route.ts");
  const serverMealsBarrel = read("lib/server-meals.ts");
  const mealUseCases = read("lib/server/meals/meal-use-cases.ts");
  const mealStorage = read("lib/server/meals/meal-storage.ts");

  assert.match(mealMutations, /fetchAuthedJson<\{ ok: true; meal: Meal \}>\("\/api\/meals"/);
  assert.match(mealMutations, /\/api\/meals\/\$\{encodedMealId\}/);
  assert.match(createRoute, /verifyRequestUser/);
  assert.match(createRoute, /from "@\/lib\/server\/meals\/meal-use-cases"/);
  assert.match(createRoute, /createMealDocument/);
  assert.doesNotMatch(createRoute, /@\/lib\/server-meals/);
  assert.match(mealRoute, /export async function PATCH/);
  assert.match(mealRoute, /from "@\/lib\/server\/meals\/meal-use-cases"/);
  assert.match(mealRoute, /from "@\/lib\/server\/meals\/meal-storage"/);
  assert.match(mealRoute, /updateMealDocument/);
  assert.match(mealRoute, /planMealDeleteOperation/);
  assert.match(mealRoute, /deleteMealCommentsByMealId/);
  assert.match(mealRoute, /markMealDeleteJob/);
  assert.doesNotMatch(mealRoute, /const planDeleteOperation = async/);
  assert.doesNotMatch(mealRoute, /const deleteMealComments = async/);
  assert.match(serverMealsBarrel, /from "@\/lib\/server\/meals\/meal-use-cases"/);
  assert.match(serverMealsBarrel, /from "@\/lib\/server\/meals\/meal-storage"/);
  assert.match(mealUseCases, /export const createMealDocument = async/);
  assert.match(mealUseCases, /export const updateMealDocument = async/);
  assert.match(mealUseCases, /export const planMealDeleteOperation = async/);
  assert.match(mealUseCases, /export const deleteMealCommentsByMealId = async/);
  assert.match(mealUseCases, /export const markMealDeleteJob = async/);
  assert.match(mealUseCases, /buildMealKeywords/);
  assert.match(mealStorage, /export const deleteStorageObjectByUrl = async/);
  assert.doesNotMatch(mealMutations, /await addDoc\(mealsRef/);
  assert.doesNotMatch(mealMutations, /await updateDoc\(mealRef/);
});

test("meal mutations fail closed for legacy records without ownerUid", () => {
  const serverMealsBarrel = read("lib/server-meals.ts");
  const mealUseCases = read("lib/server/meals/meal-use-cases.ts");
  const mealTypes = read("lib/server/meals/meal-types.ts");

  assert.match(mealUseCases, /Legacy meals must be migrated before mutation/);
  assert.doesNotMatch(mealUseCases, /legacyAllowed/);
  assert.doesNotMatch(mealUseCases, /isLegacyParticipant/);
  assert.doesNotMatch(mealTypes, /export const isLegacyParticipant =/);
  assert.doesNotMatch(serverMealsBarrel, /isLegacyParticipant/);
});

test("owner backfill migration script exists for legacy meals", () => {
  const scriptPath = path.join(process.cwd(), "scripts", "backfill-meal-owners.mjs");
  assert.equal(fs.existsSync(scriptPath), true);

  const source = fs.readFileSync(scriptPath, "utf8");
  assert.match(source, /--dry-run/);
  assert.match(source, /ownerUid/);
  assert.match(source, /resolveLegacyMealOwnerUid/);
});

test("archive queries are handled by authenticated server route and server meal helpers", () => {
  const archiveRoute = read("app/api/archive/route.ts");
  const archiveUseCases = read("lib/server/meals/archive-use-cases.ts");
  const archiveTypes = read("lib/server/meals/archive-types.ts");
  const serverMealsBarrel = read("lib/server-meals.ts");

  assert.match(archiveRoute, /verifyRequestUser/);
  assert.match(archiveRoute, /listArchiveMeals/);
  assert.match(archiveUseCases, /export const listArchiveMeals = async/);
  assert.match(archiveTypes, /export const parseArchiveQueryParams =/);
  assert.match(archiveTypes, /export const encodeArchiveCursor =/);
  assert.match(serverMealsBarrel, /from "@\/lib\/server\/meals\/archive-use-cases"/);
  assert.match(serverMealsBarrel, /from "@\/lib\/server\/meals\/archive-types"/);
});

test("client delete mutations preserve structured route status for callers", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");

  assert.match(mealMutations, /export type MealDeleteResult = \{/);
  assert.match(mealMutations, /deleted: boolean;/);
  assert.match(mealMutations, /export type MealDeleteStatus =/);
  assert.match(mealMutations, /status: MealDeleteStatus;/);
  assert.match(mealMutations, /const isMealDeleteStatus = \(value: unknown\): value is MealDeleteStatus =>/);
  assert.match(mealMutations, /if \(!isMealDeleteStatus\(response\.status\)\) \{/);
  assert.match(mealMutations, /throw new Error\("Unexpected delete status"\)/);
  assert.match(mealMutations, /export const deleteMeal = async \(id: string\): Promise<MealDeleteResult> => \{/);
  assert.match(mealMutations, /const response = await fetchAuthedJson<\{ ok: true; deleted: boolean; status: string \}>\(/);
});

test("server meal serialization normalizes legacy userId into userIds", () => {
  const mealTypes = read("lib/server/meals/meal-types.ts");
  const serializers = read("lib/client/serializers.ts");

  assert.match(
    mealTypes,
    /const normalizedUserIds = Array\.isArray\(data\.userIds\)\s*\?\s*data\.userIds\.filter\(\(value\): value is UserRole => isUserRole\(value\)\)\s*:\s*\[\];/s
  );
  assert.match(
    mealTypes,
    /const userIds = normalizedUserIds\.length > 0 \? normalizedUserIds : isUserRole\(data\.userId\) \? \[data\.userId\] : \[\];/
  );
  assert.match(
    serializers,
    /const normalizedUserIds = Array\.isArray\(mealData\.userIds\)\s*\?\s*mealData\.userIds\.filter\(\(role\): role is UserRole => isUserRole\(role\)\)\s*:\s*\[\];/s
  );
  assert.match(
    serializers,
    /if \(normalizedUserIds\.length > 0\) \{\s*return normalizedUserIds;\s*\}\s*if \(isUserRole\(mealData\.userId\)\) \{/s
  );
});

test("server meal updates remove deprecated userId from modern write paths", () => {
  const mealUseCases = read("lib/server/meals/meal-use-cases.ts");

  assert.match(mealUseCases, /dataToUpdate\.userId = FieldValue\.delete\(\);/);
  assert.doesNotMatch(
    mealUseCases,
    /userId: isUserRole\(current\.userId\) \? current\.userId : undefined/
  );
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
  const serverMealsBarrel = read("lib/server-meals.ts");
  const mealStorage = read("lib/server/meals/meal-storage.ts");
  const mealTypes = read("lib/server/meals/meal-types.ts");
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
  assert.match(mealStorage, /from "@\/lib\/config\/server-env"/);
  assert.match(mealTypes, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(serverMealsBarrel, /from "@\/lib\/server\/meals\/meal-types"/);
  assert.match(uploadRoute, /from "@\/lib\/config\/server-env"/);
  assert.match(profilePage, /from "@\/lib\/client\/profile"/);

  assert.doesNotMatch(firebaseAdmin, /process\.env\.NEXT_PUBLIC_FIREBASE_PROJECT_ID/);
  assert.doesNotMatch(mealTypes, /const VALID_MEAL_TYPES:/);
  assert.doesNotMatch(mealTypes, /const VALID_ROLES:/);
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
