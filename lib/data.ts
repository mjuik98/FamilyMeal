import { Meal, UserRole } from './types';
import { db } from './firebase';
import {
    collection, addDoc, query, where, getDocs, orderBy, Timestamp,
    getDoc, doc, updateDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';

export const users: UserRole[] = ['아빠', '엄마', '딸', '아들'];

// Helper to convert Firestore timestamp to number
const convertMeal = (docSnap: any): Meal => {
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
    const dataToUpdate: any = { ...updates };
    if (updates.timestamp) {
        dataToUpdate.timestamp = Timestamp.fromMillis(updates.timestamp);
    }
    await updateDoc(mealRef, dataToUpdate);
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
    const results: { date: Date; label: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);

        const mealsRef = collection(db, 'meals');
        const q = query(
            mealsRef,
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end))
        );
        const snapshot = await getDocs(q);

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        results.push({
            date: d,
            label: dayNames[d.getDay()],
            count: snapshot.size,
        });
    }
    return results;
};

/**
 * Search meals by description text.
 * Firestore doesn't support full-text search, so we fetch recent meals and filter client-side.
 */
export const searchMeals = async (keyword: string): Promise<Meal[]> => {
    const mealsRef = collection(db, 'meals');
    const q = query(mealsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(convertMeal);
    const lower = keyword.toLowerCase();
    return all.filter(m =>
        m.description.toLowerCase().includes(lower) ||
        m.type.toLowerCase().includes(lower) ||
        m.userIds?.some(u => u.toLowerCase().includes(lower))
    );
};
