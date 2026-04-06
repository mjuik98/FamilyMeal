import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const exists = (relativePath) => fs.existsSync(path.join(process.cwd(), relativePath));

test("server auth uses server-only allowlist and production fail-closed guard", () => {
  const platformServerAuth = read("lib/platform/auth/server-auth.ts");
  assert.match(platformServerAuth, /from "@\/lib\/config\/server-env"/);
  assert.match(platformServerAuth, /from "@\/lib\/firebase-admin"/);
  assert.match(platformServerAuth, /serverEnv\.allowedEmails/);
  assert.match(platformServerAuth, /Server allowlist is not configured/);
  assert.match(platformServerAuth, /assertAllowlistConfigured/);
  assert.doesNotMatch(platformServerAuth, /adminDb/);
  assert.doesNotMatch(platformServerAuth, /getUserRole/);
  assert.doesNotMatch(platformServerAuth, /NEXT_PUBLIC_ALLOWED_EMAILS/);
  assert.equal(exists("lib/server-auth.ts"), false);
});

test("comment creation rechecks meal visibility on the server", () => {
  const commentRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentAdminStore = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");
  const mealVisibility = read("lib/modules/meals/server/meal-visibility.ts");
  assert.match(commentRoute, /assertValidCommentRole/);
  assert.match(commentUseCases, /Valid user role is required/);
  assert.match(commentAdminStore, /assertMealVisibleToRole/);
  assert.match(mealVisibility, /export const assertMealVisibleToRole =/);
  assert.match(mealVisibility, /export const isMealVisibleToRole =/);
  assert.doesNotMatch(commentUseCases, /const canCommentOnMeal =/);
  assert.doesNotMatch(commentUseCases, /Meal participants must include your role/);
});

test("role updates are handled by server route with lock policy", () => {
  const roleRoute = read("app/api/profile/role/route.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const platformRouteAuth = read("lib/platform/auth/route-auth.ts");
  const serverEnv = read("lib/config/server-env.ts");
  assert.match(roleRoute, /from "@\/lib\/config\/server-env"/);
  assert.match(roleRoute, /from "@\/lib\/modules\/profile\/server\/profile-use-cases"/);
  assert.match(roleRoute, /from "@\/lib\/platform\/auth\/route-auth"/);
  assert.match(roleRoute, /serverEnv\.allowRoleReassign/);
  assert.match(roleRoute, /allowRoleReassign/);
  assert.match(profileUseCases, /Role is locked/);
  assert.match(roleRoute, /requireVerifiedUser/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "route-auth.ts")), false);
  assert.match(platformRouteAuth, /verifyRequestUser/);
  assert.match(serverEnv, /allowRoleReassign:/);
  assert.doesNotMatch(roleRoute, /process\.env\.ALLOW_ROLE_REASSIGN/);
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
  const moduleActivityLog = read("lib/modules/activity/server/activity-log.ts");
  const activityAdminStore = read("lib/modules/activity/adapters/firestore/activity-admin-store.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentAdminStore = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");
  const reactionAdminStore = read("lib/modules/reactions/adapters/firestore/reaction-admin-store.ts");

  assert.match(settingsRoute, /requireVerifiedUser/);
  assert.match(settingsRoute, /notificationPreferences/);
  assert.match(moduleActivityLog, /from "@\/lib\/modules\/activity\/adapters\/firestore\/activity-admin-store"/);
  assert.match(activityAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(activityAdminStore, /users"\)\.doc\(recipientUid\)\.collection\("activity"\)/);
  assert.match(commentUseCases, /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-admin-store"/);
  assert.match(commentAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(commentAdminStore, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.match(commentAdminStore, /from "@\/lib\/modules\/meals\/server\/meal-visibility"/);
  assert.doesNotMatch(commentUseCases, /from "@\/lib\/activity-log"/);
  assert.match(mealReactionRoute, /from "@\/lib\/modules\/reactions\/server\/reaction-use-cases"/);
  assert.match(commentReactionRoute, /from "@\/lib\/modules\/reactions\/server\/reaction-use-cases"/);
  assert.match(reactionUseCases, /from "@\/lib\/modules\/reactions\/adapters\/firestore\/reaction-admin-store"/);
  assert.match(reactionAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(reactionAdminStore, /from "@\/lib\/modules\/activity\/server\/activity-log"/);
  assert.match(reactionAdminStore, /from "@\/lib\/modules\/meals\/server\/meal-visibility"/);
  assert.match(reactionAdminStore, /syncMealReactionActivity/);
  assert.match(reactionAdminStore, /syncCommentReactionActivity/);
  assert.doesNotMatch(moduleActivityLog, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(commentUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(reactionUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealReactionRoute, /adminDb\.runTransaction/);
  assert.doesNotMatch(commentReactionRoute, /adminDb\.runTransaction/);
  assert.equal(exists("lib/activity-log.ts"), false);
});

test("profile routes delegate to extracted server profile use cases", () => {
  const roleRoute = read("app/api/profile/role/route.ts");
  const settingsRoute = read("app/api/profile/settings/route.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");
  const profileAdminAuth = read("lib/modules/profile/adapters/firebase/profile-admin-auth.ts");
  const profileAdminStore = read("lib/modules/profile/adapters/firebase/profile-admin-store.ts");

  assert.match(roleRoute, /from "@\/lib\/modules\/profile\/server\/profile-use-cases"/);
  assert.match(settingsRoute, /from "@\/lib\/modules\/profile\/server\/profile-use-cases"/);
  assert.match(profileUseCases, /export const saveUserRoleProfile = async/);
  assert.match(profileUseCases, /export const saveUserNotificationPreferences = async/);
  assert.match(profileUseCases, /from "@\/lib\/modules\/profile\/adapters\/firebase\/profile-admin-auth"/);
  assert.match(profileUseCases, /from "@\/lib\/modules\/profile\/adapters\/firebase\/profile-admin-store"/);
  assert.match(profileAuthContext, /from "@\/lib\/modules\/profile\/adapters\/firebase\/profile-admin-store"/);
  assert.match(profileAdminAuth, /from "@\/lib\/firebase-admin"/);
  assert.match(profileAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(roleRoute, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(settingsRoute, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(profileUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(profileAuthContext, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(roleRoute, /adminDb\.runTransaction/);
  assert.doesNotMatch(roleRoute, /adminAuth\.getUser/);
  assert.doesNotMatch(settingsRoute, /adminDb\.collection/);
});

test("meal image uploads are handled by authenticated server route", () => {
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const uploadHelper = read("lib/uploadImage.ts");
  const uploadAdapter = read("lib/modules/meals/adapters/storage/meal-image-upload.ts");
  const imagePolicy = read("lib/modules/meals/domain/meal-image-policy.ts");
  const multipartHelper = read("lib/platform/http/multipart-file.ts");
  const packageJson = read("package.json");

  assert.match(uploadRoute, /requireVerifiedUser/);
  assert.match(uploadRoute, /from "@\/lib\/platform\/http\/route-handler"/);
  assert.match(uploadRoute, /from "@\/lib\/platform\/http\/multipart-file"/);
  assert.match(uploadRoute, /serverEnv\.storageBucket/);
  assert.match(uploadRoute, /from "@\/lib\/modules\/meals\/adapters\/storage\/meal-image-upload"/);
  assert.match(uploadRoute, /export async function DELETE/);
  assert.match(uploadRoute, /deleteStorageObjectByUrl/);
  assert.match(uploadRoute, /validateUploadContentLength/);
  assert.match(uploadRoute, /validateUploadContentType/);
  assert.match(uploadRoute, /parseMultipartFileFromRequest/);
  assert.match(uploadRoute, /request\.headers\.get\("content-length"\)/);
  assert.match(uploadRoute, /request\.headers\.get\("content-type"\)/);
  assert.match(uploadRoute, /multipart\/form-data/);
  assert.doesNotMatch(uploadRoute, /await request\.formData\(\)/);
  assert.doesNotMatch(uploadRoute, /getRouteErrorPayload/);
  assert.doesNotMatch(uploadRoute, /getRouteErrorStatus/);
  assert.match(multipartHelper, /from "busboy"/);
  assert.match(multipartHelper, /Readable\.fromWeb/);
  assert.match(multipartHelper, /Image upload request is too large/);
  assert.match(uploadAdapter, /export const storeMealImageFile = async/);
  assert.match(uploadAdapter, /from "sharp"/);
  assert.match(uploadAdapter, /\.rotate\(\)/);
  assert.match(uploadAdapter, /\.resize\(/);
  assert.match(uploadAdapter, /\.jpeg\(/);
  assert.match(uploadAdapter, /adminStorage/);
  assert.match(
    uploadAdapter,
    /const buildStoragePath = \(uid: string\): string => `meals\/\$\{uid\}\/\$\{Date\.now\(\)\}_\$\{randomUUID\(\)\}\.jpg`/
  );
  assert.equal(
    fs.existsSync(path.join(process.cwd(), "lib", "server", "uploads", "meal-image-use-cases.ts")),
    false
  );
  assert.match(packageJson, /"sharp":\s*"/);
  assert.match(packageJson, /"busboy":\s*"/);
  assert.equal(exists("lib/meal-image-policy.ts"), false);
  assert.match(imagePolicy, /MAX_MEAL_IMAGE_REQUEST_BYTES/);
  assert.match(uploadHelper, /\/api\/uploads\/meal-image/);
  assert.match(uploadHelper, /new FormData\(\)/);
  assert.match(uploadHelper, /formData\.append\("file", imageFile, imageFile\.name\)/);
  assert.match(uploadHelper, /method:\s*"DELETE"/);
  assert.match(uploadHelper, /cleanupUploadedMealImage/);
  assert.doesNotMatch(uploadHelper, /canvas\.toBlob/);
  assert.doesNotMatch(uploadHelper, /canvas\.toDataURL/);
  assert.doesNotMatch(uploadHelper, /new Image\(/);
  assert.doesNotMatch(uploadHelper, /firebase\/storage/);
  assert.doesNotMatch(uploadRoute, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(uploadRoute, /from "@\/lib\/server\/uploads\/meal-image-use-cases"/);
  assert.doesNotMatch(uploadRoute, /adminStorage\.bucket/);
});

test("meal image uploads no longer accept caller-controlled storage paths", () => {
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const uploadAdapter = read("lib/modules/meals/adapters/storage/meal-image-upload.ts");
  const uploadHelper = read("lib/uploadImage.ts");

  assert.doesNotMatch(uploadRoute, /path:\s*z\.string/);
  assert.match(uploadAdapter, /const buildStoragePath = \(uid: string\): string => `meals\/\$\{uid\}\/\$\{Date\.now\(\)\}_\$\{randomUUID\(\)\}\.jpg`/);
  assert.doesNotMatch(uploadRoute, /requestedPath/);
  assert.doesNotMatch(uploadHelper, /path\?: string/);
  assert.doesNotMatch(uploadHelper, /JSON\.stringify\(\{ imageData, path \}\)/);
});

test("meal routes delegate to extracted server meal modules", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealQueries = read("lib/client/meal-queries.ts");
  const createRoute = read("app/api/meals/route.ts");
  const mealRoute = read("app/api/meals/[id]/route.ts");
  const mealReadUseCases = read("lib/modules/meals/server/meal-read-use-cases.ts");
  const mealWriteUseCases = read("lib/modules/meals/server/meal-write-use-cases.ts");
  const mealDeleteUseCases = read("lib/modules/meals/server/meal-delete-use-cases.ts");
  const mealStorage = read("lib/modules/meals/server/meal-storage.ts");
  const mealAdminStore = read("lib/modules/meals/adapters/firestore/meal-admin-store.ts");
  const mealArchiveStore = read("lib/modules/meals/adapters/firestore/meal-archive-store.ts");
  const mealDeleteStore = read("lib/modules/meals/adapters/firestore/meal-delete-store.ts");
  const mealStorageAdmin = read("lib/modules/meals/adapters/storage/meal-storage-admin.ts");
  const serverMealsBarrelPath = path.join(process.cwd(), "lib", "server-meals.ts");

  assert.match(mealMutations, /fetchAuthedJson<\{ ok: true; meal: Meal \}>\("\/api\/meals"/);
  assert.match(mealMutations, /\/api\/meals\/\$\{encodedMealId\}/);
  assert.match(createRoute, /requireValidatedUserRole/);
  assert.match(createRoute, /from "@\/lib\/modules\/meals\/server\/meal-read-use-cases"/);
  assert.match(createRoute, /from "@\/lib\/modules\/meals\/server\/meal-write-use-cases"/);
  assert.match(createRoute, /createMealDocument/);
  assert.match(createRoute, /listMealsForDate/);
  assert.doesNotMatch(createRoute, /@\/lib\/server-meals/);
  assert.match(mealRoute, /export async function GET/);
  assert.match(mealRoute, /from "@\/lib\/modules\/meals\/server\/meal-read-use-cases"/);
  assert.match(mealRoute, /export async function PATCH/);
  assert.match(mealRoute, /from "@\/lib\/modules\/meals\/server\/meal-write-use-cases"/);
  assert.match(mealRoute, /from "@\/lib\/modules\/meals\/server\/meal-delete-use-cases"/);
  assert.match(mealRoute, /from "@\/lib\/modules\/meals\/server\/meal-storage"/);
  assert.match(mealRoute, /from "@\/lib\/platform\/auth\/route-auth"/);
  assert.match(mealRoute, /updateMealDocument/);
  assert.match(
    mealRoute,
    /updateMealDocument\(\{[\s\S]*actorRole:\s*role,[\s\S]*input:\s*input as UpdateMealInput,/s
  );
  assert.match(mealRoute, /planMealDeleteOperation/);
  assert.match(mealRoute, /deleteMealCommentsByMealId/);
  assert.match(mealRoute, /deleteMealActivitiesByMealId/);
  assert.match(mealRoute, /deleteMealDocumentById/);
  assert.match(mealRoute, /markMealDeleteJob/);
  assert.doesNotMatch(mealRoute, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealRoute, /const planDeleteOperation = async/);
  assert.doesNotMatch(mealRoute, /const deleteMealComments = async/);
  assert.doesNotMatch(mealRoute, /verifyRequestUser/);
  assert.doesNotMatch(mealRoute, /getUserRole/);
  assert.equal(fs.existsSync(serverMealsBarrelPath), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-read-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-write-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-delete-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-storage.ts")), false);
  assert.match(mealReadUseCases, /export const listMealsForDate = async/);
  assert.match(mealReadUseCases, /export const listWeeklyMealStats = async/);
  assert.match(mealReadUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-admin-store"/);
  assert.match(mealWriteUseCases, /export const createMealDocument = async/);
  assert.match(mealWriteUseCases, /export const updateMealDocument = async/);
  assert.match(mealWriteUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-admin-store"/);
  assert.match(mealDeleteUseCases, /export const planMealDeleteOperation = async/);
  assert.match(mealDeleteUseCases, /export const deleteMealCommentsByMealId = deleteStoredMealCommentsByMealId;/);
  assert.match(mealDeleteUseCases, /export const deleteMealActivitiesByMealId = deleteStoredMealActivitiesByMealId;/);
  assert.match(mealDeleteUseCases, /export const deleteMealDocumentById = deleteStoredMealDocumentById;/);
  assert.match(mealDeleteUseCases, /export const markMealDeleteJob = async/);
  assert.match(mealDeleteUseCases, /from "@\/lib\/modules\/meals\/adapters\/firestore\/meal-delete-store"/);
  assert.match(mealStorage, /export const deleteStorageObjectByUrl = async/);
  assert.match(mealStorage, /from "@\/lib\/modules\/meals\/adapters\/storage\/meal-storage-admin"/);
  assert.match(mealAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(mealArchiveStore, /from "@\/lib\/firebase-admin"/);
  assert.match(mealDeleteStore, /from "@\/lib\/firebase-admin"/);
  assert.match(mealStorageAdmin, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealReadUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealWriteUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealDeleteUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealStorage, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(mealMutations, /await addDoc\(mealsRef/);
  assert.doesNotMatch(mealMutations, /await updateDoc\(mealRef/);
  assert.match(mealQueries, /fetchAuthedJson<\{ ok: true; meal: Meal \| null \}>\(/);
  assert.doesNotMatch(mealQueries, /doc\(db, "meals", id\)/);
  assert.doesNotMatch(mealQueries, /getDoc\(mealRef\)/);
});

test("meal edit mutations preserve timestamp updates through the patch stack", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealRoute = read("app/api/meals/[id]/route.ts");
  const mealTypes = read("lib/modules/meals/server/meal-types.ts");
  const mealWriteUseCases = read("lib/modules/meals/server/meal-write-use-cases.ts");

  assert.doesNotMatch(
    mealMutations,
    /delete \(nextUpdates as \{ timestamp\?: unknown \}\)\.timestamp;/
  );
  assert.match(mealRoute, /timestamp:\s*z\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/);
  assert.match(mealTypes, /export type UpdateMealInput = \{[\s\S]*timestamp\?: unknown;/);
  assert.match(
    mealWriteUseCases,
    /if \("timestamp" in input && input\.timestamp !== undefined\) \{[\s\S]*dataToUpdate\.timestamp = Timestamp\.fromMillis\(nextTimestamp\);/s
  );
});

test("meal day reads use shared explicit date helpers instead of local clock math", () => {
  const mealReadUseCases = read("lib/modules/meals/server/meal-read-use-cases.ts");
  const dateUtils = read("lib/date-utils.ts");

  assert.match(mealReadUseCases, /from "@\/lib\/date-utils"/);
  assert.match(mealReadUseCases, /getDayRangeForDate/);
  assert.match(mealReadUseCases, /getWeekDatesForDate/);
  assert.match(mealReadUseCases, /formatDateKey\(new Date\(meal\.timestamp\)\)/);
  assert.doesNotMatch(mealReadUseCases, /const getDayRange =/);
  assert.doesNotMatch(mealReadUseCases, /setHours\(0, 0, 0, 0\)/);
  assert.doesNotMatch(mealReadUseCases, /setHours\(23, 59, 59, 999\)/);
  assert.match(dateUtils, /export const getDayRangeForDate =/);
  assert.match(dateUtils, /export const getWeekDatesForDate =/);
});

test("meal mutations fail closed for legacy records without ownerUid", () => {
  const mealWriteUseCases = read("lib/modules/meals/server/meal-write-use-cases.ts");
  const mealDeleteUseCases = read("lib/modules/meals/server/meal-delete-use-cases.ts");
  const mealTypes = read("lib/modules/meals/server/meal-types.ts");
  const serverMealsBarrelPath = path.join(process.cwd(), "lib", "server-meals.ts");

  assert.match(mealWriteUseCases, /Legacy meals must be migrated before mutation/);
  assert.match(mealDeleteUseCases, /Legacy meals must be migrated before mutation/);
  assert.doesNotMatch(mealWriteUseCases, /legacyAllowed/);
  assert.doesNotMatch(mealDeleteUseCases, /legacyAllowed/);
  assert.doesNotMatch(mealTypes, /export const isLegacyParticipant =/);
  assert.equal(fs.existsSync(serverMealsBarrelPath), false);
});

test("owner backfill migration script exists for legacy meals", () => {
  const scriptPath = path.join(process.cwd(), "scripts", "backfill-meal-owners.mjs");
  assert.equal(fs.existsSync(scriptPath), true);

  const source = fs.readFileSync(scriptPath, "utf8");
  assert.match(source, /--dry-run/);
  assert.match(source, /ownerUid/);
  assert.match(source, /resolveLegacyMealOwnerUid/);
});

test("profile session reads are handled by server route and client loader avoids direct Firestore access", () => {
  const sessionRoutePath = path.join(process.cwd(), "app", "api", "profile", "session", "route.ts");
  const profileSession = read("lib/client/profile-session.ts");

  assert.equal(fs.existsSync(sessionRoutePath), true);

  const sessionRoute = read("app/api/profile/session/route.ts");
  const profileUseCases = read("lib/modules/profile/server/profile-use-cases.ts");

  assert.match(sessionRoute, /from "@\/lib\/modules\/profile\/server\/profile-use-cases"/);
  assert.match(sessionRoute, /requireVerifiedUser/);
  assert.match(sessionRoute, /loadUserProfileSession/);
  assert.match(profileUseCases, /export const loadUserProfileSession = async/);
  assert.match(profileSession, /fetchAuthedJson<\{ ok: true; profile\?: UserProfile \| null \}>/);
  assert.doesNotMatch(profileSession, /from "firebase\/firestore"/);
  assert.doesNotMatch(profileSession, /from "@\/lib\/firebase"/);
  assert.doesNotMatch(profileSession, /getDoc\(userDocRef\)/);
});

test("migration script admin context fails closed when project id is missing", () => {
  const adminContext = read("scripts/lib/firebase-admin-app.mjs");

  assert.doesNotMatch(adminContext, /DEFAULT_PROJECT_ID/);
  assert.match(adminContext, /throw new Error\("Firebase project id is required for admin scripts"\)/);
});

test("archive queries are handled by authenticated server route and server meal helpers", () => {
  const archiveRoute = read("app/api/archive/route.ts");
  const archiveUseCases = read("lib/modules/meals/server/archive-use-cases.ts");
  const archiveTypes = read("lib/modules/meals/server/archive-types.ts");
  const serverMealsBarrelPath = path.join(process.cwd(), "lib", "server-meals.ts");

  assert.match(archiveRoute, /requireValidatedUserRole/);
  assert.match(archiveRoute, /listArchiveMeals/);
  assert.match(archiveUseCases, /export const listArchiveMeals = async/);
  assert.match(archiveTypes, /export const parseArchiveQueryParams =/);
  assert.match(archiveTypes, /export const encodeArchiveCursor =/);
  assert.equal(fs.existsSync(serverMealsBarrelPath), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "archive-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "archive-types.ts")), false);
});

test("client delete mutations preserve structured route status for callers", () => {
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealContracts = read("lib/modules/meals/contracts.ts");

  assert.match(mealContracts, /export type MealDeleteResult = \{/);
  assert.match(mealContracts, /deleted: boolean;/);
  assert.match(mealContracts, /export type MealDeleteStatus =/);
  assert.match(mealContracts, /status: MealDeleteStatus;/);
  assert.match(mealMutations, /from "@\/lib\/modules\/meals\/contracts"/);
  assert.match(mealMutations, /const isMealDeleteStatus = \(value: unknown\): value is MealDeleteStatus =>/);
  assert.match(mealMutations, /if \(!isMealDeleteStatus\(response\.status\)\) \{/);
  assert.match(mealMutations, /throw new Error\("Unexpected delete status"\)/);
  assert.match(mealMutations, /export const deleteMeal = async \(id: string\): Promise<MealDeleteResult> => \{/);
  assert.match(mealMutations, /const response = await fetchAuthedJson<\{ ok: true; deleted: boolean; status: string \}>\(/);
});

test("server meal serialization normalizes legacy userId into userIds", () => {
  const mealTypes = read("lib/modules/meals/server/meal-types.ts");
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
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-types.ts")), false);
});

test("server meal updates remove deprecated userId from modern write paths", () => {
  const mealWriteUseCases = read("lib/modules/meals/server/meal-write-use-cases.ts");

  assert.match(mealWriteUseCases, /dataToUpdate\.userId = FieldValue\.delete\(\);/);
  assert.doesNotMatch(
    mealWriteUseCases,
    /userId: isUserRole\(current\.userId\) \? current\.userId : undefined/
  );
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-write-use-cases.ts")), false);
});

test("route handlers share common route error helpers", () => {
  const platformRouteErrors = read("lib/platform/http/route-errors.ts");
  const routeHandler = read("lib/platform/http/route-handler.ts");
  const settingsRoute = read("app/api/profile/settings/route.ts");
  const roleRoute = read("app/api/profile/role/route.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const mealCommentsRoute = read("app/api/meals/[id]/comments/route.ts");
  const mealReactionsRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const commentReactionsRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");

  assert.match(platformRouteErrors, /export class RouteError extends Error/);
  assert.match(platformRouteErrors, /export const getRouteErrorStatus/);
  assert.match(platformRouteErrors, /export const getRouteErrorMessage/);
  assert.match(routeHandler, /getRouteErrorPayload/);
  assert.match(routeHandler, /getRouteErrorStatus/);
  assert.equal(exists("lib/route-errors.ts"), false);

  for (const source of [settingsRoute, roleRoute, mealCommentsRoute, mealReactionsRoute, commentRoute, commentReactionsRoute]) {
    assert.match(source, /@\/lib\/platform\/http\/route-handler/);
    assert.doesNotMatch(source, /class RouteError extends Error/);
    assert.doesNotMatch(source, /const getErrorStatus =/);
    assert.doesNotMatch(source, /const getErrorMessage =/);
  }

  for (const source of [uploadRoute]) {
    assert.match(source, /@\/lib\/platform\/http\/route-errors/);
    assert.doesNotMatch(source, /class RouteError extends Error/);
    assert.doesNotMatch(source, /const getErrorStatus =/);
    assert.doesNotMatch(source, /const getErrorMessage =/);
  }
});

test("client error collection uses shared config and logging helpers", () => {
  const clientErrorRoute = read("app/api/client-errors/route.ts");
  const clientErrorIngest = read("lib/platform/http/client-error-ingest.ts");
  const observabilityReporter = read("lib/platform/observability/error-reporter.ts");
  const serverEnv = read("lib/config/server-env.ts");
  const logger = read("lib/logging.ts");

  assert.match(clientErrorRoute, /from "@\/lib\/platform\/http\/client-error-ingest"/);
  assert.match(clientErrorRoute, /from "@\/lib\/platform\/http\/route-handler"/);
  assert.doesNotMatch(clientErrorRoute, /from "@\/lib\/config\/server-env"/);
  assert.doesNotMatch(clientErrorRoute, /from "@\/lib\/logging"/);
  assert.match(clientErrorIngest, /from "@\/lib\/config\/server-env"/);
  assert.match(clientErrorIngest, /from "@\/lib\/logging"/);
  assert.match(clientErrorIngest, /from "@\/lib\/platform\/observability\/error-reporter"/);
  assert.match(clientErrorIngest, /serverEnv\.upstash/);
  assert.match(clientErrorIngest, /logError/);
  assert.match(clientErrorIngest, /const normalizeUrlForLogging =/);
  assert.match(clientErrorIngest, /const sanitizeClientErrorPayload =/);
  assert.match(clientErrorIngest, /search = ""/);
  assert.match(clientErrorIngest, /hash = ""/);
  assert.match(clientErrorIngest, /delete sanitizedPayload\.userAgent/);
  assert.match(observabilityReporter, /from "@opentelemetry\/api"/);
  assert.match(observabilityReporter, /serverEnv\.observability/);
  assert.match(observabilityReporter, /recordException/);
  assert.match(observabilityReporter, /fetch\(serverEnv\.observability\.webhookUrl/);
  assert.doesNotMatch(clientErrorRoute, /process\.env\.UPSTASH_REDIS_REST_URL/);
  assert.doesNotMatch(clientErrorRoute, /console\.error/);
  assert.match(serverEnv, /upstash:/);
  assert.match(serverEnv, /observability:/);
  assert.match(logger, /export const logError =/);
});

test("firebase config includes firestore indexes for archive optimization", () => {
  const firebaseConfig = read("firebase.json");
  const firestoreIndexes = read("firestore.indexes.json");

  assert.match(firebaseConfig, /"indexes":\s*"firestore\.indexes\.json"/);
  assert.match(firestoreIndexes, /"collectionGroup":\s*"meals"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"userIds"[\s\S]*"arrayConfig":\s*"CONTAINS"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"userId"[\s\S]*"order":\s*"ASCENDING"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"type"[\s\S]*"order":\s*"ASCENDING"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"timestamp"[\s\S]*"order":\s*"DESCENDING"/);
});

test("proxy and version routes use shared env accessors", () => {
  const proxy = read("proxy.ts");
  const versionRoute = read("app/api/version/route.ts");
  const publicEnv = read("lib/config/public-env.ts");
  const serverEnv = read("lib/config/server-env.ts");

  assert.match(proxy, /from "@\/lib\/config\/public-env"/);
  assert.match(proxy, /from "@\/lib\/config\/server-env"/);
  assert.match(versionRoute, /from "@\/lib\/config\/server-env"/);
  assert.match(publicEnv, /enableQa:/);
  assert.match(publicEnv, /appVersion:/);
  assert.match(serverEnv, /qaRouteToken:/);
  assert.match(serverEnv, /deploymentVersion:/);
  assert.doesNotMatch(proxy, /process\.env\.NEXT_PUBLIC_ENABLE_QA/);
  assert.doesNotMatch(proxy, /process\.env\.QA_ROUTE_TOKEN/);
  assert.doesNotMatch(versionRoute, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
});

test("comment delete route no longer allows role-only legacy participant deletes", () => {
  const commentRoute = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");

  assert.match(commentRoute, /const isOwner =/);
  assert.match(commentRoute, /const isAuthor =/);
  assert.doesNotMatch(commentRoute, /const isLegacyParticipant =/);
  assert.doesNotMatch(commentRoute, /isLegacyAllowed/);
});

test("client meal readers use explicit serialization and remove unused activity-feed builder", () => {
  const serializers = read("lib/client/serializers.ts");

  assert.match(serializers, /export const serializeMealSnapshot =/);
  assert.doesNotMatch(serializers, /return\s*\{\s*id:\s*docSnap\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.doesNotMatch(serializers, /return\s*\{\s*id:\s*snapshot\.id,\s*\.\.\.data[\s\S]*\}\s*as Meal/);
  assert.equal(exists("lib/client/meals.ts"), false);
});

test("comment count updates use atomic increments on create and guarded decrements on delete", () => {
  const commentUseCases = read("lib/modules/comments/adapters/firestore/comment-admin-store.ts");

  assert.match(commentUseCases, /FieldValue\.increment\(1\)/);
  assert.doesNotMatch(commentUseCases, /commentCount:\s*baseCount \+ 1/);
  assert.match(commentUseCases, /commentCount:/);
});

test("server auth can reject non-allowlisted emails before full token verification", () => {
  const serverAuth = read("lib/platform/auth/server-auth.ts");

  assert.match(serverAuth, /decodeJwtPayload/);
  assert.match(serverAuth, /getUnverifiedEmailFromToken/);
  assert.match(serverAuth, /const unverifiedEmail = getUnverifiedEmailFromToken\(token\)/);
  assert.match(serverAuth, /if \(unverifiedEmail && !isAllowedEmail\(unverifiedEmail\)\)/);
  assert.match(serverAuth, /const decoded = await adminAuth\.verifyIdToken\(token, true\)/);
});

test("route auth helpers centralize verified-user and role loading", () => {
  const platformRouteAuth = read("lib/platform/auth/route-auth.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");
  const mealCreateRoute = read("app/api/meals/route.ts");
  const archiveRoute = read("app/api/archive/route.ts");
  const commentCreateRoute = read("app/api/meals/[id]/comments/route.ts");
  const mealReactionRoute = read("app/api/meals/[id]/reactions/route.ts");
  const commentReactionRoute = read("app/api/meals/[id]/comments/[commentId]/reactions/route.ts");
  const commentMutationRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const profileRoleRoute = read("app/api/profile/role/route.ts");
  const profileSettingsRoute = read("app/api/profile/settings/route.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");

  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "route-auth.ts")), false);
  assert.match(profileAuthContext, /export const loadUserRoleForUser = async/);
  assert.match(platformRouteAuth, /export const requireVerifiedUser = async/);
  assert.match(platformRouteAuth, /export const requireValidatedUserRole = async/);
  assert.match(platformRouteAuth, /verifyRequestUser/);
  assert.match(platformRouteAuth, /from "@\/lib\/modules\/profile\/server\/profile-auth-context"/);
  assert.match(platformRouteAuth, /loadUserRoleForUser/);
  assert.doesNotMatch(platformRouteAuth, /getUserRole/);

  for (const source of [
    mealCreateRoute,
    archiveRoute,
    commentCreateRoute,
    mealReactionRoute,
    commentReactionRoute,
    commentMutationRoute,
    profileRoleRoute,
    profileSettingsRoute,
    uploadRoute,
  ]) {
    assert.match(source, /@\/lib\/platform\/auth\/route-auth/);
    assert.doesNotMatch(source, /from "@\/lib\/server\/route-auth"/);
    assert.doesNotMatch(source, /from "@\/lib\/server-auth"/);
  }

  assert.match(mealCreateRoute, /requireValidatedUserRole/);
  assert.match(archiveRoute, /requireValidatedUserRole/);
  assert.match(commentCreateRoute, /requireValidatedUserRole/);
  assert.match(mealReactionRoute, /requireValidatedUserRole/);
  assert.match(commentReactionRoute, /requireValidatedUserRole/);
  assert.match(commentMutationRoute, /requireVerifiedUser/);
  assert.match(profileRoleRoute, /requireVerifiedUser/);
  assert.match(profileSettingsRoute, /requireVerifiedUser/);
  assert.match(uploadRoute, /requireVerifiedUser/);
});

test("server config and meal policy are centralized in shared modules", () => {
  const publicEnv = read("lib/config/public-env.ts");
  const serverEnv = read("lib/config/server-env.ts");
  const mealPolicy = read("lib/domain/meal-policy.ts");
  const firebaseAdmin = read("lib/firebase-admin.ts");
  const platformServerAuth = read("lib/platform/auth/server-auth.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");
  const profileAdminStore = read("lib/modules/profile/adapters/firebase/profile-admin-store.ts");
  const mealImageUrl = read("lib/modules/meals/server/meal-image-url.ts");
  const mealStorage = read("lib/modules/meals/server/meal-storage.ts");
  const mealTypes = read("lib/modules/meals/server/meal-types.ts");
  const uploadRoute = read("app/api/uploads/meal-image/route.ts");
  const profilePage = read("app/profile/page.tsx");
  const envCompatPath = path.join(process.cwd(), "lib", "env.ts");
  const serverMealsBarrelPath = path.join(process.cwd(), "lib", "server-meals.ts");

  assert.match(publicEnv, /export const publicEnv/);
  assert.match(serverEnv, /export const serverEnv/);
  assert.equal(fs.existsSync(envCompatPath), false);
  assert.equal(fs.existsSync(serverMealsBarrelPath), false);
  assert.match(mealPolicy, /export const USER_ROLES/);
  assert.match(mealPolicy, /export const VALID_MEAL_TYPES/);
  assert.match(mealPolicy, /export const MAX_MEAL_DESCRIPTION_LENGTH/);

  assert.match(firebaseAdmin, /from "@\/lib\/config\/server-env"/);
  assert.equal(exists("lib/server-auth.ts"), false);
  assert.match(platformServerAuth, /from "@\/lib\/config\/server-env"/);
  assert.match(profileAuthContext, /from "@\/lib\/modules\/profile\/adapters\/firebase\/profile-admin-store"/);
  assert.match(profileAdminStore, /from "@\/lib\/firebase-admin"/);
  assert.match(mealImageUrl, /from "@\/lib\/config\/server-env"/);
  assert.match(mealStorage, /from "@\/lib\/modules\/meals\/server\/meal-image-url"/);
  assert.match(mealTypes, /from "@\/lib\/domain\/meal-policy"/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-image-url.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-storage.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "meal-types.ts")), false);
  assert.match(uploadRoute, /from "@\/lib\/config\/server-env"/);
  assert.match(profilePage, /from "@\/lib\/domain\/meal-policy"/);
  assert.doesNotMatch(profilePage, /from "@\/lib\/client\/profile"/);

  assert.doesNotMatch(firebaseAdmin, /process\.env\.NEXT_PUBLIC_FIREBASE_PROJECT_ID/);
  assert.doesNotMatch(mealTypes, /const VALID_MEAL_TYPES:/);
  assert.doesNotMatch(mealTypes, /const VALID_ROLES:/);
});

test("comment routes delegate to extracted server use cases", () => {
  const commentCreateRoute = read("app/api/meals/[id]/comments/route.ts");
  const commentMutationRoute = read("app/api/meals/[id]/comments/[commentId]/route.ts");
  const commentUseCases = read("lib/modules/comments/server/comment-use-cases.ts");
  const commentPolicy = read("lib/modules/comments/server/comment-policy.ts");

  assert.match(commentCreateRoute, /from "@\/lib\/modules\/comments\/server\/comment-use-cases"/);
  assert.match(commentCreateRoute, /from "@\/lib\/modules\/comments\/server\/comment-policy"/);
  assert.match(commentMutationRoute, /from "@\/lib\/modules\/comments\/server\/comment-use-cases"/);
  assert.match(commentMutationRoute, /from "@\/lib\/modules\/comments\/server\/comment-policy"/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "comments", "comment-use-cases.ts")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "comments", "comment-policy.ts")), false);
  assert.match(commentUseCases, /export const createMealComment = async/);
  assert.match(commentUseCases, /export const updateMealCommentById = async/);
  assert.match(commentUseCases, /export const deleteMealCommentById = async/);
  assert.match(commentUseCases, /from "@\/lib\/modules\/comments\/adapters\/firestore\/comment-admin-store"/);
  assert.match(commentPolicy, /export const CommentCreateSchema/);
  assert.match(commentPolicy, /export const CommentUpdateSchema/);
  assert.doesNotMatch(commentUseCases, /from "@\/lib\/firebase-admin"/);
  assert.doesNotMatch(commentCreateRoute, /adminDb\.runTransaction/);
  assert.doesNotMatch(commentMutationRoute, /adminDb\.runTransaction/);
});

test("shared meal policy constants are reused across routes and draft helpers", () => {
  const mealDraft = read("lib/modules/meals/domain/meal-draft.ts");
  const mealCreateRoute = read("app/api/meals/route.ts");
  const mealUpdateRoute = read("app/api/meals/[id]/route.ts");
  const roleRoute = read("app/api/profile/role/route.ts");
  const reactionUseCases = read("lib/modules/reactions/server/reaction-use-cases.ts");

  assert.equal(exists("lib/meal-draft.ts"), false);
  assert.match(mealDraft, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(mealCreateRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(mealUpdateRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(roleRoute, /from "@\/lib\/domain\/meal-policy"/);
  assert.match(reactionUseCases, /from "@\/lib\/domain\/meal-policy"/);

  assert.doesNotMatch(mealDraft, /const VALID_TYPES =/);
  assert.doesNotMatch(mealDraft, /const VALID_USERS =/);
  assert.doesNotMatch(mealCreateRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(mealCreateRoute, /const VALID_MEAL_TYPES = \["아침"/);
  assert.doesNotMatch(mealUpdateRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(mealUpdateRoute, /const VALID_MEAL_TYPES = \["아침"/);
  assert.doesNotMatch(roleRoute, /const VALID_ROLES = \["아빠"/);
  assert.doesNotMatch(reactionUseCases, /new Set\(\["아빠"/);
});

test("meal client access is split into query, mutation, and filtering modules", () => {
  const mealQueries = read("lib/client/meal-queries.ts");
  const mealMutations = read("lib/client/meal-mutations.ts");
  const mealFilters = read("lib/client/meal-filters.ts");
  const mealEngagement = read("lib/domain/meal-engagement.ts");

  assert.equal(exists("lib/client/meals.ts"), false);

  assert.match(mealQueries, /export const getMealsForDate = async/);
  assert.match(mealQueries, /export const getRecentMeals = async/);
  assert.match(mealQueries, /export const subscribeMealsForDate =/);
  assert.match(mealQueries, /export const searchMeals = async/);
  assert.match(mealQueries, /export const getWeeklyStats = async/);

  assert.match(mealMutations, /export const addMeal = async/);
  assert.match(mealMutations, /export const updateMeal = async/);
  assert.match(mealMutations, /export const deleteMeal = async/);

  assert.match(mealFilters, /export const filterAndSortMeals =/);
  assert.match(mealFilters, /from "@\/lib\/domain\/meal-engagement"/);
  assert.match(mealEngagement, /export const getMealCommentCount =/);
});
