export type UserRole = '아빠' | '엄마' | '딸' | '아들';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
}

export interface MealComment {
  id: string;
  author: UserRole;
  authorUid: string;
  text: string;
  timestamp?: number; // legacy fallback
  createdAt: number;
  updatedAt: number;
}

export interface Meal {
  id: string; // Firestore Doc ID
  userId?: UserRole; // Deprecated, kept for legacy data
  userIds?: UserRole[]; // New field for multiple users
  keywords?: string[]; // Search index tokens
  imageUrl?: string;
  description: string;
  type: '아침' | '점심' | '저녁' | '간식';
  timestamp: number;
  comments?: MealComment[];
}
