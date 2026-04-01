import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { convertCommentDoc } from "@/lib/client/serializers";
import { db } from "@/lib/firebase";
import type { MealComment } from "@/lib/types";

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
