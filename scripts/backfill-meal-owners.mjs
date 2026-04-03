#!/usr/bin/env node

/*
  Usage:
    node scripts/backfill-meal-owners.mjs --dry-run
    node scripts/backfill-meal-owners.mjs

  Requirements:
    - Service account or ADC credentials available.
    - FIREBASE_PROJECT_ID env var recommended.
*/

import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'family-meal-91736';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();

function normalizeRole(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveLegacyMealOwnerUid(mealData, usersByRole) {
  if (typeof mealData?.ownerUid === 'string' && mealData.ownerUid.trim()) {
    return mealData.ownerUid.trim();
  }

  const explicitRole = normalizeRole(mealData?.userId);
  if (explicitRole && typeof usersByRole.get(explicitRole) === 'string') {
    return usersByRole.get(explicitRole);
  }

  const normalizedRoles = Array.isArray(mealData?.userIds)
    ? mealData.userIds.map(normalizeRole).filter(Boolean)
    : [];
  if (normalizedRoles.length === 1) {
    const onlyRole = normalizedRoles[0];
    if (typeof usersByRole.get(onlyRole) === 'string') {
      return usersByRole.get(onlyRole);
    }
  }

  return null;
}

async function loadUsersByRole() {
  const usersSnap = await db.collection('users').get();
  const grouped = new Map();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const role = normalizeRole(data.role);
    if (!role) continue;

    const bucket = grouped.get(role) ?? [];
    bucket.push(userDoc.id);
    grouped.set(role, bucket);
  }

  const uniqueUsersByRole = new Map();
  for (const [role, uids] of grouped.entries()) {
    if (uids.length === 1) {
      uniqueUsersByRole.set(role, uids[0]);
    }
  }

  return uniqueUsersByRole;
}

async function main() {
  console.log(`[backfill:owners] start (dryRun=${DRY_RUN}, project=${PROJECT_ID})`);

  const usersByRole = await loadUsersByRole();
  const mealsSnap = await db.collection('meals').get();

  const metrics = {
    totalMeals: mealsSnap.size,
    alreadyOwned: 0,
    updated: 0,
    unresolved: 0,
  };

  for (const mealDoc of mealsSnap.docs) {
    const data = mealDoc.data();
    if (typeof data.ownerUid === 'string' && data.ownerUid.trim()) {
      metrics.alreadyOwned += 1;
      continue;
    }

    const ownerUid = resolveLegacyMealOwnerUid(data, usersByRole);
    if (!ownerUid) {
      metrics.unresolved += 1;
      continue;
    }

    metrics.updated += 1;
    if (!DRY_RUN) {
      await mealDoc.ref.set({ ownerUid }, { merge: true });
    }
  }

  console.log('[backfill:owners] done');
  console.log(`- total meals: ${metrics.totalMeals}`);
  console.log(`- already owned: ${metrics.alreadyOwned}`);
  console.log(`- ownerUid backfilled: ${metrics.updated}`);
  console.log(`- unresolved meals: ${metrics.unresolved}`);
}

const isEntryScript =
  process.argv[1] ? import.meta.url === new URL(process.argv[1], 'file://').href : false;

if (isEntryScript) {
  main().catch((error) => {
    console.error('[backfill:owners] failed', error);
    process.exitCode = 1;
  });
}
