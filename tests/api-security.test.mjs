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

test("comment creation route checks meal participant authorization", () => {
  const commentRoute = read("app/api/meals/[id]/comments/route.ts");
  assert.match(commentRoute, /const canCommentOnMeal =/);
  assert.match(commentRoute, /throw new RouteError\("Not allowed", 403\)/);
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
