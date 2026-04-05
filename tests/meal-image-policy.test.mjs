import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("meal image policy centralizes accepted types and request limits", () => {
  const source = read("lib/modules/meals/domain/meal-image-policy.ts");
  const shim = read("lib/meal-image-policy.ts");

  assert.match(source, /MAX_MEAL_IMAGE_UPLOAD_BYTES/);
  assert.match(source, /MAX_MEAL_IMAGE_REQUEST_BYTES/);
  assert.match(source, /ALLOWED_MEAL_IMAGE_TYPES/);
  assert.match(source, /image\/heic/);
  assert.match(source, /image\/heif/);
  assert.match(source, /export const validateMealImageFile =/);
  assert.match(source, /export const formatMealImageFileSize =/);
  assert.match(shim, /modules\/meals\/domain\/meal-image-policy/);
});

test("meal image validation returns explicit error codes and messages", () => {
  const source = read("lib/modules/meals/domain/meal-image-policy.ts");

  assert.match(source, /code:\s*"invalid_type"/);
  assert.match(source, /code:\s*"file_too_large"/);
  assert.match(source, /지원하지 않는 이미지 형식/);
  assert.match(source, /이미지 용량이 너무 큽니다/);
  assert.match(source, /return null;/);
});
