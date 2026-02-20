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

