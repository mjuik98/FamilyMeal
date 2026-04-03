export type UserRole = '아빠' | '엄마' | '딸' | '아들';
export type ReactionEmoji = '❤️' | '👍' | '😋' | '👏' | '🔥';
export type ReactionMap = Partial<Record<ReactionEmoji, string[]>>;
export type UserActivityType = 'meal-comment' | 'comment-reply' | 'meal-reaction' | 'comment-reaction';

export interface NotificationPreferences {
  browserEnabled: boolean;
  commentAlerts: boolean;
  reactionAlerts: boolean;
  replyAlerts: boolean;
}

export interface UserActivity {
  id: string;
  type: UserActivityType;
  actorUid: string;
  actorRole: UserRole;
  mealId: string;
  commentId?: string;
  reactionEmoji?: ReactionEmoji;
  preview: string;
  createdAt: number;
  readAt?: number | null;
}

export interface WeeklyMealStat {
  date: Date;
  label: string;
  count: number;
  previewImageUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  notificationPreferences?: NotificationPreferences;
}

export interface MealComment {
  id: string;
  author: UserRole;
  authorUid: string;
  text: string;
  parentId?: string;
  mentionedAuthor?: UserRole;
  timestamp?: number; // legacy fallback
  createdAt: number;
  updatedAt: number;
  reactions?: ReactionMap;
}

export interface Meal {
  id: string; // Firestore Doc ID
  ownerUid?: string;
  userId?: UserRole; // Deprecated, kept for legacy data
  userIds?: UserRole[]; // New field for multiple users
  keywords?: string[]; // Search index tokens
  imageUrl?: string;
  description: string;
  type: '아침' | '점심' | '저녁' | '간식';
  timestamp: number;
  commentCount?: number;
  comments?: MealComment[];
  reactions?: ReactionMap;
}
