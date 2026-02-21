#!/usr/bin/env node

/*
  Usage:
    node scripts/migrate-meals-schema.mjs --dry-run
    node scripts/migrate-meals-schema.mjs

  Requirements:
    - Service account or ADC credentials available.
    - FIREBASE_PROJECT_ID env var recommended.
*/

import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'family-meal-91736';

const ROLES = ['아빠', '엄마', '딸', '아들'];
const ROLE_SET = new Set(ROLES);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();

function sanitizeRoleList(raw) {
  if (!Array.isArray(raw)) return [];
  const unique = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    if (!ROLE_SET.has(value)) continue;
    if (!unique.includes(value)) unique.push(value);
  }
  return unique;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildMealKeywords({ description, type, userIds, userId }) {
  const roles = Array.isArray(userIds) && userIds.length > 0 ? userIds : userId ? [userId] : [];
  const raw = `${description} ${type} ${roles.join(' ')}`.toLowerCase();
  const tokens = raw
    .split(/[\s,./!?()[\]{}"'`~:;|\\-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return Array.from(new Set(tokens));
}

function isValidCommentCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function getResolvedUserIds(data) {
  const normalizedUserIds = sanitizeRoleList(data.userIds);
  if (normalizedUserIds.length > 0) return normalizedUserIds;
  if (typeof data.userId === 'string' && ROLE_SET.has(data.userId)) return [data.userId];
  return [...ROLES];
}

function isTimestampInstance(value) {
  return value instanceof admin.firestore.Timestamp;
}

async function resolveCommentCount(mealDoc, data) {
  if (Array.isArray(data.comments)) {
    return data.comments.length;
  }
  const commentsSnap = await mealDoc.ref
    .collection('comments')
    .select(admin.firestore.FieldPath.documentId())
    .get();
  return commentsSnap.size;
}

async function migrateMeal(mealDoc, metrics) {
  const data = mealDoc.data();
  const patch = {};

  const resolvedUserIds = getResolvedUserIds(data);
  const currentUserIds = sanitizeRoleList(data.userIds);
  if (!arraysEqual(currentUserIds, resolvedUserIds)) {
    patch.userIds = resolvedUserIds;
    metrics.fieldUpdates.userIds += 1;
  }

  const canonicalUserId = resolvedUserIds[0];
  if (typeof data.userId !== 'string' || data.userId !== canonicalUserId) {
    patch.userId = canonicalUserId;
    metrics.fieldUpdates.userId += 1;
  }

  const description = typeof data.description === 'string' ? data.description : '';
  const type = typeof data.type === 'string' ? data.type : '';
  const nextKeywords = buildMealKeywords({
    description,
    type,
    userIds: resolvedUserIds,
    userId: canonicalUserId,
  });
  const currentKeywords = Array.isArray(data.keywords) ? data.keywords.filter((v) => typeof v === 'string') : [];
  if (!arraysEqual(currentKeywords, nextKeywords)) {
    patch.keywords = nextKeywords;
    metrics.fieldUpdates.keywords += 1;
  }

  if (!isValidCommentCount(data.commentCount)) {
    patch.commentCount = await resolveCommentCount(mealDoc, data);
    metrics.fieldUpdates.commentCount += 1;
  }

  if (typeof data.timestamp === 'number' && Number.isFinite(data.timestamp)) {
    patch.timestamp = admin.firestore.Timestamp.fromMillis(data.timestamp);
    metrics.fieldUpdates.timestamp += 1;
  } else if (!isTimestampInstance(data.timestamp)) {
    metrics.unresolved.invalidTimestamp += 1;
  }

  if (typeof data.ownerUid !== 'string' || data.ownerUid.trim().length === 0) {
    metrics.unresolved.ownerUid += 1;
  }

  const changed = Object.keys(patch).length > 0;
  if (!changed) return;

  metrics.touchedMeals += 1;
  if (!DRY_RUN) {
    await mealDoc.ref.update(patch);
  }
}

async function main() {
  console.log(`[migrate:meals] start (dryRun=${DRY_RUN}, project=${PROJECT_ID})`);

  const mealsSnap = await db.collection('meals').get();
  const metrics = {
    totalMeals: mealsSnap.size,
    touchedMeals: 0,
    fieldUpdates: {
      userIds: 0,
      userId: 0,
      keywords: 0,
      commentCount: 0,
      timestamp: 0,
    },
    unresolved: {
      ownerUid: 0,
      invalidTimestamp: 0,
    },
  };

  for (const mealDoc of mealsSnap.docs) {
    await migrateMeal(mealDoc, metrics);
  }

  console.log('[migrate:meals] done');
  console.log(`- total meals: ${metrics.totalMeals}`);
  console.log(`- meals touched: ${metrics.touchedMeals}`);
  console.log('- field updates:');
  console.log(`  - userIds: ${metrics.fieldUpdates.userIds}`);
  console.log(`  - userId: ${metrics.fieldUpdates.userId}`);
  console.log(`  - keywords: ${metrics.fieldUpdates.keywords}`);
  console.log(`  - commentCount: ${metrics.fieldUpdates.commentCount}`);
  console.log(`  - timestamp: ${metrics.fieldUpdates.timestamp}`);
  console.log('- unresolved:');
  console.log(`  - ownerUid missing: ${metrics.unresolved.ownerUid}`);
  console.log(`  - invalid timestamp: ${metrics.unresolved.invalidTimestamp}`);
}

main().catch((error) => {
  console.error('[migrate:meals] failed', error);
  process.exitCode = 1;
});
