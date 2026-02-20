import { Meal, UserRole } from './types';
import { db } from './firebase';
import {
    collection, addDoc, query, where, getDocs, orderBy, Timestamp,
    getDoc, doc, updateDoc, deleteDoc, onSnapshot, limit, DocumentData, QueryDocumentSnapshot
} from 'firebase/firestore';

export const users: UserRole[] = ['아빠', '엄마', '딸', '아들'];

// Helper to convert Firestore timestamp to number
const convertMeal = (docSnap: QueryDocumentSnapshot<DocumentData>): Meal => {
    const data = docSnap.data();
    // Backward compatibility: If userIds is missing, use userId wrapped in array
    const userIds = data.userIds || (data.userId ? [data.userId] : []);

    return {
        id: docSnap.id,
        ...data,
        userIds,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now()
    } as Meal;
};

const buildMealKeywords = (meal: Pick<Meal, 'description' | 'type' | 'userIds' | 'userId'>): string[] => {
    const raw = `${meal.description} ${meal.type} ${(meal.userIds || (meal.userId ? [meal.userId] : [])).join(' ')}`.toLowerCase();
    const tokens = raw
        .split(/[\s,./!?()[\]{}"'`~:;|\\-]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
    return Array.from(new Set(tokens));
};

const matchesKeyword = (meal: Meal, keyword: string): boolean => {
    const lower = keyword.toLowerCase();
    return meal.description.toLowerCase().includes(lower) ||
        meal.type.toLowerCase().includes(lower) ||
        Boolean(meal.userIds?.some((u) => u.toLowerCase().includes(lower))) ||
        Boolean(meal.keywords?.some((k) => k.includes(lower)));
};

export const getMealsForDate = async (date: Date): Promise<Meal[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const mealsRef = collection(db, 'meals');
    const q = query(
        mealsRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertMeal);
};

/**
 * Real-time subscription to meals for a given date.
 * Returns an unsubscribe function.
 */
export const subscribeMealsForDate = (
    date: Date,
    onMeals: (meals: Meal[]) => void,
    onError?: (error: Error) => void
) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const mealsRef = collection(db, 'meals');
    const q = query(
        mealsRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q,
        (snapshot) => {
            const meals = snapshot.docs.map(convertMeal);
            onMeals(meals);
        },
        (error) => {
            console.error('Failed to subscribe to meals', error);
            onError?.(error);
        }
    );
};

export const addMeal = async (meal: Omit<Meal, 'id'>) => {
    const mealsRef = collection(db, 'meals');
    await addDoc(mealsRef, {
        ...meal,
        keywords: buildMealKeywords(meal),
        timestamp: Timestamp.fromMillis(meal.timestamp)
    });
};

export const getMealById = async (id: string): Promise<Meal | null> => {
    const mealRef = doc(db, 'meals', id);
    const snapshot = await getDoc(mealRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const userIds = data.userIds || (data.userId ? [data.userId] : []);
    return {
        id: snapshot.id,
        ...data,
        userIds,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now()
    } as Meal;
};

export const updateMeal = async (id: string, updates: Partial<Omit<Meal, 'id'>>) => {
    const mealRef = doc(db, 'meals', id);
    const dataToUpdate: Record<string, unknown> = { ...updates };
    if (typeof updates.timestamp === 'number') {
        dataToUpdate.timestamp = Timestamp.fromMillis(updates.timestamp);
    }
    if (updates.description || updates.type || updates.userIds || updates.userId) {
        const snapshot = await getDoc(mealRef);
        const prev = snapshot.exists() ? (snapshot.data() as Partial<Meal>) : {};
        dataToUpdate.keywords = buildMealKeywords({
            description: updates.description ?? prev.description ?? '',
            type: updates.type ?? prev.type ?? '점심',
            userIds: updates.userIds ?? prev.userIds,
            userId: updates.userId ?? prev.userId
        });
    }
    await updateDoc(mealRef, dataToUpdate as DocumentData);
};

export const deleteMeal = async (id: string) => {
    const mealRef = doc(db, 'meals', id);
    await deleteDoc(mealRef);
};

/**
 * Get meal counts for each of the last 7 days.
 * Returns array of { date, label, count } from oldest to newest.
 */
export const getWeeklyStats = async (): Promise<{ date: Date; label: string; count: number }[]> => {
    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dates = Array.from({ length: 7 }, (_, idx) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - idx));
        return d;
    });

    return Promise.all(
        dates.map(async (date) => {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            const mealsRef = collection(db, 'meals');
            const q = query(
                mealsRef,
                where('timestamp', '>=', Timestamp.fromDate(start)),
                where('timestamp', '<=', Timestamp.fromDate(end))
            );
            const snapshot = await getDocs(q);

            return {
                date,
                label: dayNames[date.getDay()],
                count: snapshot.size,
            };
        })
    );
};

/**
 * Search meals by description text.
 * Firestore doesn't support full-text search, so we fetch recent meals and filter client-side.
 */
export const searchMeals = async (keyword: string): Promise<Meal[]> => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return [];

    const mealsRef = collection(db, 'meals');
    const firstToken = normalized.split(/\s+/)[0];

    try {
        const indexedQuery = query(
            mealsRef,
            where('keywords', 'array-contains', firstToken),
            limit(200)
        );
        const indexedSnapshot = await getDocs(indexedQuery);
        const indexedMeals = indexedSnapshot.docs.map(convertMeal);
        if (indexedMeals.length > 0) {
            return indexedMeals
                .filter((meal) => matchesKeyword(meal, normalized))
                .sort((a, b) => b.timestamp - a.timestamp);
        }
    } catch (error) {
        console.warn('Indexed search failed, falling back to full scan', error);
    }

    const fallbackQuery = query(mealsRef, orderBy('timestamp', 'desc'), limit(500));
    const fallbackSnapshot = await getDocs(fallbackQuery);
    const all = fallbackSnapshot.docs.map(convertMeal);
    return all.filter((meal) => matchesKeyword(meal, normalized));
};
