import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("server auth uses server-only allowlist and production fail-closed guard", () => {
  const serverAuth = read("lib/server-auth.ts");
  assert.match(serverAuth, /process\.env\.ALLOWED_EMAILS/);
  assert.match(serverAuth, /Server allowlist is not configured/);
  assert.match(serverAuth, /assertAllowlistConfigured/);
  assert.doesNotMatch(serverAuth, /allowedEmailsRaw[\s\S]*NEXT_PUBLIC_ALLOWED_EMAILS/);
});

test("comment creation route only requires authenticated role", () => {
  const commentRoute = read("app/api/meals/[id]/comments/route.ts");
  assert.match(commentRoute, /Valid user role is required/);
  assert.doesNotMatch(commentRoute, /const canCommentOnMeal =/);
  assert.doesNotMatch(commentRoute, /throw new RouteError\("Not allowed", 403\)/);
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
  const mealCommentRoute = read("app/api/meals/[id]/comments/route.ts");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");

  assert.match(settingsRoute, /verifyRequestUser/);
  assert.match(settingsRoute, /notificationPreferences/);
  assert.match(activityLog, /users"\)\.doc\(recipientUid\)\.collection\("activity"\)/);
  assert.match(mealCommentRoute, /createCommentActivities/);
  assert.match(mealReactionRoute, /syncMealReactionActivity/);
  assert.match(commentReactionRoute, /syncCommentReactionActivity/);
});

test("meal image uploads are handled by authenticated server route", () => {
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const uploadHelper = read("lib/uploadImage.ts");

  assert.match(uploadRoute, /verifyRequestUser/);
  assert.match(uploadRoute, /adminStorage/);
  assert.match(uploadRoute, /NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET/);
  assert.match(uploadHelper, /\/api\/uploads\/meal-image/);
  assert.doesNotMatch(uploadHelper, /firebase\/storage/);
});

test("meal create and update mutations are handled by authenticated server APIs", () => {
  const clientData = read("lib/data.ts");
  const createRoute = read("app/api/meals/route.ts");
  const mealRoute = read("app/api/meals/[id]/route.ts");
  const serverMeals = read("lib/server-meals.ts");

  assert.match(clientData, /fetchAuthedJson<\{ ok: true; meal: Meal \}>\('\/api\/meals'/);
  assert.match(clientData, /\/api\/meals\/\$\{encodedMealId\}/);
  assert.match(createRoute, /verifyRequestUser/);
  assert.match(createRoute, /createMealDocument/);
  assert.match(mealRoute, /export async function PATCH/);
  assert.match(mealRoute, /updateMealDocument/);
  assert.match(serverMeals, /deleteStorageObjectByUrl/);
  assert.match(serverMeals, /buildMealKeywords/);
  assert.doesNotMatch(clientData, /await addDoc\(mealsRef/);
  assert.doesNotMatch(clientData, /await updateDoc\(mealRef/);
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
  const commentRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");

  assert.match(commentRoute, /const isOwner =/);
  assert.match(commentRoute, /const isAuthor =/);
  assert.doesNotMatch(commentRoute, /const isLegacyParticipant =/);
  assert.doesNotMatch(commentRoute, /isLegacyAllowed/);
});

test("client meal readers use explicit serialization and remove unused activity-feed builder", () => {
  const clientData = read("lib/data.ts");

  assert.match(clientData, /const serializeMealSnapshot =/);
  assert.doesNotMatch(clientData, /return\s*\{\s*id:\s*docSnap\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.doesNotMatch(clientData, /return\s*\{\s*id:\s*snapshot\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.doesNotMatch(clientData, /export const buildActivityFeed =/);
});

test("comment count updates use atomic increments on create and guarded decrements on delete", () => {
  const createRoute = read("app/api/meals/[id]/comments/route.ts");
  const deleteRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");

  assert.match(createRoute, /FieldValue\.increment\(1\)/);
  assert.doesNotMatch(createRoute, /commentCount:\s*baseCount \+ 1/);
  assert.match(deleteRoute, /commentCount:/);
});

test("server auth can reject non-allowlisted emails before full token verification", () => {
  const serverAuth = read("lib/server-auth.ts");

  assert.match(serverAuth, /decodeJwtPayload/);
  assert.match(serverAuth, /getUnverifiedEmailFromToken/);
  assert.match(serverAuth, /const unverifiedEmail = getUnverifiedEmailFromToken\(token\)/);
  assert.match(serverAuth, /if \(unverifiedEmail && !isAllowedEmail\(unverifiedEmail\)\)/);
  assert.match(serverAuth, /const decoded = await adminAuth\.verifyIdToken\(token, true\)/);
});
