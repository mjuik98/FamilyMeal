import { collection, doc, limit, onSnapshot, orderBy, query, Timestamp, writeBatch } from "firebase/firestore";

import { convertActivityDoc, normalizeNotificationPreferences, toActivityFeedItem } from "@/lib/activity";
import { db } from "@/lib/firebase";
import { logError } from "@/lib/logging";
import type { ActivityFeedItem, NotificationPreferences, UserActivity } from "@/lib/types";

import { fetchAuthedJson } from "@/lib/client/auth-http";

export const markAllActivitiesRead = async (uid: string, activityIds: string[]): Promise<void> => {
  if (!uid || activityIds.length === 0) return;

  const batch = writeBatch(db);
  const readAt = Timestamp.fromMillis(Date.now());
  activityIds.forEach((activityId) => {
    batch.update(doc(db, "users", uid, "activity", activityId), { readAt });
  });
  await batch.commit();
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const response = await fetchAuthedJson<{ ok: true; profile: { notificationPreferences?: unknown } }>(
    "/api/profile/settings",
    {
      method: "POST",
      body: JSON.stringify({ notificationPreferences: preferences }),
    }
  );

  return normalizeNotificationPreferences(response.profile?.notificationPreferences);
};

export const subscribeUserActivity = (
  uid: string,
  onActivities: (activities: UserActivity[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, "users", uid, "activity"), orderBy("createdAt", "desc"), limit(30));

  return onSnapshot(
    q,
    (snapshot) => {
      const activities = snapshot.docs
        .map(convertActivityDoc)
        .filter((activity): activity is UserActivity => Boolean(activity));
      onActivities(activities);
    },
    (error) => {
      logError("Failed to subscribe to activities", error);
      onError?.(error);
    }
  );
};

export const mapUserActivitiesToFeedItems = (activities: UserActivity[]): ActivityFeedItem[] =>
  activities.map(toActivityFeedItem);
