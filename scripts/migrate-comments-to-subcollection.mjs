#!/usr/bin/env node

/*
  Usage:
    node scripts/migrate-comments-to-subcollection.mjs --dry-run
    node scripts/migrate-comments-to-subcollection.mjs

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

function toMillis(value, fallback) {
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return fallback;
}

function normalizeLegacyComment(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.author !== 'string' || typeof raw.text !== 'string') return null;

  const now = Date.now();
  const createdAt = toMillis(raw.createdAt ?? raw.timestamp, now);
  const updatedAt = toMillis(raw.updatedAt ?? raw.timestamp ?? raw.createdAt, createdAt);

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `legacy-${index}`,
    author: raw.author,
    authorUid: typeof raw.authorUid === 'string' ? raw.authorUid : '',
    text: raw.text.trim(),
    createdAt,
    updatedAt,
  };
}

async function migrateMeal(mealDoc) {
  const data = mealDoc.data();
  const legacyComments = Array.isArray(data.comments) ? data.comments : [];

  if (legacyComments.length === 0) {
    if (typeof data.commentCount !== 'number') {
      if (!DRY_RUN) {
        await mealDoc.ref.update({ commentCount: 0 });
      }
      return { scanned: 0, migrated: 0, updatedCount: 1 };
    }
    return { scanned: 0, migrated: 0, updatedCount: 0 };
  }

  const commentsRef = mealDoc.ref.collection('comments');
  const existingSnap = await commentsRef.select(admin.firestore.FieldPath.documentId()).get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  let scanned = 0;
  let migrated = 0;
  const batch = db.batch();

  legacyComments.forEach((legacy, index) => {
    scanned += 1;
    const normalized = normalizeLegacyComment(legacy, index);
    if (!normalized || !normalized.text) return;
    if (existingIds.has(normalized.id)) return;

    migrated += 1;

    if (!DRY_RUN) {
      batch.set(commentsRef.doc(normalized.id), {
        author: normalized.author,
        authorUid: normalized.authorUid,
        text: normalized.text,
        createdAt: admin.firestore.Timestamp.fromMillis(normalized.createdAt),
        updatedAt: admin.firestore.Timestamp.fromMillis(normalized.updatedAt),
      });
    }
  });

  const nextCount = existingIds.size + migrated;

  if (!DRY_RUN) {
    batch.update(mealDoc.ref, {
      commentCount: nextCount,
      comments: admin.firestore.FieldValue.delete(),
    });
    await batch.commit();
  }

  return { scanned, migrated, updatedCount: 1 };
}

async function main() {
  console.log(`[migrate] start (dryRun=${DRY_RUN})`);

  const mealsSnap = await db.collection('meals').get();
  let totalScanned = 0;
  let totalMigrated = 0;
  let totalUpdatedMeals = 0;

  for (const mealDoc of mealsSnap.docs) {
    const stats = await migrateMeal(mealDoc);
    totalScanned += stats.scanned;
    totalMigrated += stats.migrated;
    totalUpdatedMeals += stats.updatedCount;
  }

  console.log('[migrate] done');
  console.log(`- meals touched: ${totalUpdatedMeals}`);
  console.log(`- legacy comments scanned: ${totalScanned}`);
  console.log(`- comments migrated: ${totalMigrated}`);
}

main().catch((error) => {
  console.error('[migrate] failed', error);
  process.exitCode = 1;
});
