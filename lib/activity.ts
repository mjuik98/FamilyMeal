import { Timestamp, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";

import type {
  ActivityFeedItem,
  NotificationPreferences,
  ReactionEmoji,
  UserActivity,
  UserActivityType,
  UserRole,
} from "@/lib/types";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browserEnabled: true,
  commentAlerts: true,
  reactionAlerts: true,
  replyAlerts: true,
};

export const ACTIVITY_TYPES: UserActivityType[] = [
  "meal-comment",
  "comment-reply",
  "meal-reaction",
  "comment-reaction",
];

export const normalizeNotificationPreferences = (
  value: unknown
): NotificationPreferences => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const source = value as Partial<NotificationPreferences>;
  return {
    browserEnabled:
      typeof source.browserEnabled === "boolean"
        ? source.browserEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.browserEnabled,
    commentAlerts:
      typeof source.commentAlerts === "boolean"
        ? source.commentAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.commentAlerts,
    reactionAlerts:
      typeof source.reactionAlerts === "boolean"
        ? source.reactionAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.reactionAlerts,
    replyAlerts:
      typeof source.replyAlerts === "boolean"
        ? source.replyAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.replyAlerts,
  };
};

const toMillis = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
};

export const normalizeUserActivity = (
  id: string,
  raw: Partial<UserActivity> & { createdAt?: unknown; readAt?: unknown }
): UserActivity | null => {
  if (
    !raw ||
    typeof raw.type !== "string" ||
    !ACTIVITY_TYPES.includes(raw.type as UserActivityType) ||
    typeof raw.actorUid !== "string" ||
    typeof raw.actorRole !== "string" ||
    typeof raw.mealId !== "string" ||
    typeof raw.preview !== "string"
  ) {
    return null;
  }

  const createdAt = toMillis(raw.createdAt) ?? Date.now();
  const readAt = toMillis(raw.readAt);

  return {
    id,
    type: raw.type as UserActivityType,
    actorUid: raw.actorUid,
    actorRole: raw.actorRole as UserRole,
    mealId: raw.mealId,
    commentId: typeof raw.commentId === "string" && raw.commentId.trim().length > 0 ? raw.commentId : undefined,
    reactionEmoji:
      typeof raw.reactionEmoji === "string" && raw.reactionEmoji.trim().length > 0
        ? (raw.reactionEmoji as ReactionEmoji)
        : undefined,
    preview: raw.preview.trim(),
    createdAt,
    readAt,
  };
};

export const convertActivityDoc = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): UserActivity | null => normalizeUserActivity(docSnap.id, docSnap.data() as Partial<UserActivity>);

export const toActivityFeedItem = (activity: UserActivity): ActivityFeedItem => {
  const actionLabelByType: Record<UserActivityType, string> = {
    "meal-comment": "내 식사에 댓글을 남겼어요",
    "comment-reply": "내 댓글에 답글을 남겼어요",
    "meal-reaction": `내 식사에 ${activity.reactionEmoji ?? "반응"}을 남겼어요`,
    "comment-reaction": `내 댓글에 ${activity.reactionEmoji ?? "반응"}을 남겼어요`,
  };

  return {
    id: activity.id,
    kind: activity.type,
    actorLabel: activity.actorRole,
    actionLabel: actionLabelByType[activity.type],
    preview: activity.preview,
    timestamp: activity.createdAt,
    readAt: activity.readAt ?? null,
  };
};
