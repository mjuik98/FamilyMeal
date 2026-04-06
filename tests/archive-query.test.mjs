import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("archive cursor helpers are defined in the server archive types module", () => {
  const archiveTypes = read("lib/modules/meals/server/archive-types.ts");

  assert.match(archiveTypes, /export const ARCHIVE_PAGE_SIZE_DEFAULT = 24;/);
  assert.match(archiveTypes, /export const ARCHIVE_PAGE_SIZE_MAX = 48;/);
  assert.match(archiveTypes, /export const encodeArchiveCursor =/);
  assert.match(archiveTypes, /export const decodeArchiveCursor =/);
  assert.match(archiveTypes, /lastTimestamp: z\.number\(\)\.int\(\)\.min\(0\)/);
  assert.match(archiveTypes, /lastId: z\.string\(\)\.trim\(\)\.min\(1\)/);
  assert.match(archiveTypes, /mode: z\.enum\(\["meal", "scan"\]\)/);
  assert.match(
    archiveTypes,
    /Buffer\.from\(JSON\.stringify\(\{ lastTimestamp, lastId, mode \}\), "utf8"\)\.toString\("base64url"\)/
  );
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "archive-types.ts")), false);
});

test("archive query parsing normalizes filters and seek cursors", () => {
  const archiveTypes = read("lib/modules/meals/server/archive-types.ts");

  assert.match(archiveTypes, /export const parseArchiveQueryParams =/);
  assert.match(archiveTypes, /limit: parsed\.data\.limit \?\? ARCHIVE_PAGE_SIZE_DEFAULT/);
  assert.match(
    archiveTypes,
    /cursor: parsed\.data\.cursor \? decodeArchiveCursor\(parsed\.data\.cursor\) : null/
  );
  assert.match(archiveTypes, /participant: parsed\.data\.participant/);
  assert.match(archiveTypes, /type: parsed\.data\.type/);
});

test("archive matching checks query, type, and participant together", () => {
  const archiveTypes = read("lib/modules/meals/server/archive-types.ts");

  assert.match(archiveTypes, /export const matchesArchiveMeal =/);
  assert.match(archiveTypes, /if \(filters\.type && meal\.type !== filters\.type\)/);
  assert.match(archiveTypes, /if \(filters\.participant && !meal\.userIds\?\.includes\(filters\.participant\)\)/);
  assert.match(archiveTypes, /meal\.description\.toLowerCase\(\)\.includes\(normalizedQuery\)/);
  assert.match(archiveTypes, /meal\.keywords\?\.some/);
});

test("archive route threads authenticated caller identity into the server use case", () => {
  const archiveRoute = read("app/api/archive/route.ts");
  const routeAuth = read("lib/platform/auth/route-auth.ts");
  const profileAuthContext = read("lib/modules/profile/server/profile-auth-context.ts");

  assert.match(archiveRoute, /const \{ user, role \} = await requireValidatedUserRole\(request\);/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "route-auth.ts")), false);
  assert.match(routeAuth, /verifyRequestUser/);
  assert.match(routeAuth, /loadUserRoleForUser/);
  assert.match(profileAuthContext, /export const loadUserRoleForUser = async/);
  assert.match(archiveRoute, /const result = await listArchiveMeals\(\{\s*\.\.\.query,\s*uid: user\.uid,\s*actorRole: role,\s*\}\);/s);
});

test("archive listing enforces participant visibility and returns partial-scan metadata", () => {
  const archiveUseCases = read("lib/modules/meals/server/archive-use-cases.ts");

  assert.match(archiveUseCases, /actorRole: UserRole/);
  assert.match(archiveUseCases, /where\("userIds", "array-contains", targetRole\)/);
  assert.match(archiveUseCases, /where\("userId", "==", params\.actorRole\)/);
  assert.match(
    archiveUseCases,
    /logWarn\(\s*"Archive query optimization unavailable; falling back to full scan"/
  );
  assert.match(
    archiveUseCases,
    /const isMealVisibleToActor = \(meal: Meal, actorRole: UserRole\): boolean =>/
  );
  assert.match(archiveUseCases, /isPartial: exhaustedScanLimit && hasMore/);
  assert.match(
    archiveUseCases,
    /nextCursor:[\s\S]*encodeArchiveCursor\([\s\S]*cursorAnchor\.timestamp,[\s\S]*cursorAnchor\.id,[\s\S]*cursorMode[\s\S]*\)[\s\S]*: null/s
  );
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib", "server", "meals", "archive-use-cases.ts")), false);
});
