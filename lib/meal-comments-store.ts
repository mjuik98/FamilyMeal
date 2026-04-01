import {
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeReactionMap } from "@/lib/reactions";
import type { MealComment, UserRole } from "@/lib/types";

type CommentListener = {
  onComments: (comments: MealComment[]) => void;
  onError?: (error: Error) => void;
};

type CommentEntry = {
  comments: MealComment[];
  listeners: Set<CommentListener>;
  unsubscribe: (() => void) | null;
  refCount: number;
  hasRemoteSnapshot: boolean;
};

const commentEntries = new Map<string, CommentEntry>();

const toMillis = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return fallback;
};

const normalizeComment = (
  id: string,
  raw: Partial<MealComment> & { createdAt?: unknown; updatedAt?: unknown; timestamp?: unknown }
): MealComment | null => {
  if (!raw?.author || !raw?.text) return null;

  const fallback = Date.now();
  const createdAt = toMillis(raw.createdAt ?? raw.timestamp, fallback);
  const updatedAt = toMillis(raw.updatedAt ?? raw.timestamp ?? raw.createdAt, createdAt);
  const timestamp = toMillis(raw.timestamp, createdAt);

  return {
    id,
    author: raw.author,
    authorUid: typeof raw.authorUid === "string" ? raw.authorUid : "",
    text: String(raw.text),
    parentId:
      typeof raw.parentId === "string" && raw.parentId.trim().length > 0
        ? raw.parentId
        : undefined,
    mentionedAuthor:
      typeof raw.mentionedAuthor === "string"
        ? (raw.mentionedAuthor as UserRole)
        : undefined,
    createdAt,
    updatedAt,
    timestamp,
    reactions: normalizeReactionMap((raw as { reactions?: unknown }).reactions),
  };
};

const convertCommentDoc = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): MealComment | null => {
  const raw = docSnap.data() as Partial<MealComment> & {
    createdAt?: unknown;
    updatedAt?: unknown;
    timestamp?: unknown;
  };
  return normalizeComment(docSnap.id, raw);
};

const emitComments = (entry: CommentEntry) => {
  entry.listeners.forEach((listener) => {
    listener.onComments(entry.comments);
  });
};

const emitError = (entry: CommentEntry, error: Error) => {
  entry.listeners.forEach((listener) => {
    listener.onError?.(error);
  });
};

const getOrCreateEntry = (mealId: string): CommentEntry => {
  const existing = commentEntries.get(mealId);
  if (existing) return existing;

  const next: CommentEntry = {
    comments: [],
    listeners: new Set<CommentListener>(),
    unsubscribe: null,
    refCount: 0,
    hasRemoteSnapshot: false,
  };
  commentEntries.set(mealId, next);
  return next;
};

const startRemoteSubscription = (mealId: string, entry: CommentEntry) => {
  if (entry.unsubscribe) return;

  const commentsRef = collection(db, "meals", mealId, "comments");
  const commentsQuery = query(commentsRef, orderBy("createdAt", "asc"));

  entry.unsubscribe = onSnapshot(
    commentsQuery,
    (snapshot) => {
      entry.comments = snapshot.docs
        .map(convertCommentDoc)
        .filter((comment): comment is MealComment => Boolean(comment));
      entry.hasRemoteSnapshot = true;
      emitComments(entry);
    },
    (error) => {
      console.error("Failed to subscribe to comments", error);
      emitError(entry, error);
    }
  );
};

export const subscribeToMealComments = (
  mealId: string,
  options: {
    fallbackComments?: MealComment[];
    onError?: (error: Error) => void;
  },
  onComments: (comments: MealComment[]) => void
) => {
  const entry = getOrCreateEntry(mealId);
  const listener: CommentListener = { onComments, onError: options.onError };

  entry.listeners.add(listener);
  entry.refCount += 1;

  if (entry.hasRemoteSnapshot || entry.comments.length > 0) {
    onComments(entry.comments);
  } else if (options.fallbackComments) {
    onComments(options.fallbackComments);
  }

  startRemoteSubscription(mealId, entry);

  return () => {
    entry.listeners.delete(listener);
    entry.refCount = Math.max(0, entry.refCount - 1);

    if (entry.refCount === 0) {
      entry.unsubscribe?.();
      commentEntries.delete(mealId);
    }
  };
};
