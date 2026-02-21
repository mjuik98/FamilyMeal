import { Meal, MealComment, UserRole } from './types';
import { auth, db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    getDoc,
    doc,
    updateDoc,
    onSnapshot,
    limit,
    DocumentData,
    QueryDocumentSnapshot,
} from 'firebase/firestore';

export const users: UserRole[] = ['아빠', '엄마', '딸', '아들'];

const DEFAULT_MEAL_TYPE: Meal['type'] = '점심';

const getAccessToken = async (): Promise<string> => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }
    return user.getIdToken();
};

const getErrorMessageFromResponse = async (response: Response, fallback: string): Promise<string> => {
    try {
        const payload = (await response.json()) as { error?: unknown };
        if (typeof payload?.error === 'string' && payload.error.trim().length > 0) {
            return payload.error;
        }
    } catch {
        // Ignore JSON parse errors and use fallback.
    }
    return fallback;
};

const fetchAuthedJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
    const token = await getAccessToken();
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(input, {
        ...init,
        headers,
        cache: 'no-store',
    });

    if (!response.ok) {
        const message = await getErrorMessageFromResponse(response, `Request failed (${response.status})`);
        throw new Error(message);
    }

    return (await response.json()) as T;
};

const toMillis = (value: unknown, fallback: number): number => {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
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
        authorUid: typeof raw.authorUid === 'string' ? raw.authorUid : '',
        text: String(raw.text),
        createdAt,
        updatedAt,
        timestamp,
    };
};

const normalizeComments = (rawComments: unknown): MealComment[] => {
    if (!Array.isArray(rawComments)) return [];
    return rawComments
        .map((comment, index) => {
            const raw = comment as Partial<MealComment> & { createdAt?: unknown; updatedAt?: unknown; timestamp?: unknown };
            const id = typeof raw.id === 'string' && raw.id ? raw.id : `legacy-${index}`;
            return normalizeComment(id, raw);
        })
        .filter((comment): comment is MealComment => Boolean(comment))
        .sort((a, b) => a.createdAt - b.createdAt);
};

const convertCommentDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): MealComment | null => {
    const raw = docSnap.data() as Partial<MealComment> & { createdAt?: unknown; updatedAt?: unknown; timestamp?: unknown };
    return normalizeComment(docSnap.id, raw);
};

const mealParticipants = (mealData: Partial<Meal> & { userIds?: unknown; userId?: unknown }): UserRole[] => {
    if (Array.isArray(mealData.userIds)) {
        return mealData.userIds.filter((role): role is UserRole => typeof role === 'string' && users.includes(role as UserRole));
    }
    if (typeof mealData.userId === 'string' && users.includes(mealData.userId as UserRole)) {
        return [mealData.userId as UserRole];
    }
    return [];
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

const convertMeal = (docSnap: QueryDocumentSnapshot<DocumentData>): Meal => {
    const data = docSnap.data();
    const userIds = mealParticipants(data);
    const comments = normalizeComments(data.comments);
    const commentCount = typeof data.commentCount === 'number' ? data.commentCount : comments.length;

    return {
        id: docSnap.id,
        ...data,
        ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : undefined,
        userIds,
        comments,
        commentCount,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
    } as Meal;
};

const getDayRange = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
};

const dedupeAndSortMeals = (meals: Meal[]): Meal[] => {
    const byId = new Map<string, Meal>();
    meals.forEach((meal) => byId.set(meal.id, meal));
    return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
};

export const getMealsForDate = async (date: Date): Promise<Meal[]> => {
    const { startOfDay, endOfDay } = getDayRange(date);
    const mealsRef = collection(db, 'meals');
    const q = query(
        mealsRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return dedupeAndSortMeals(snapshot.docs.map(convertMeal));
};

export const subscribeMealsForDate = (
    date: Date,
    onMeals: (meals: Meal[]) => void,
    onError?: (error: Error) => void
) => {
    const { startOfDay, endOfDay } = getDayRange(date);
    const mealsRef = collection(db, 'meals');
    const q = query(
        mealsRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const meals = dedupeAndSortMeals(snapshot.docs.map(convertMeal));
            onMeals(meals);
        },
        (error) => {
            console.error('Failed to subscribe to meals', error);
            onError?.(error);
        }
    );
};

export const addMeal = async (meal: Omit<Meal, 'id'>) => {
    if (!meal.ownerUid) {
        throw new Error('ownerUid is required');
    }

    const mealsRef = collection(db, 'meals');
    const { comments, ...restMeal } = meal;
    const commentCount = comments?.length ?? meal.commentCount ?? 0;

    await addDoc(mealsRef, {
        ...restMeal,
        commentCount,
        keywords: buildMealKeywords(restMeal),
        timestamp: Timestamp.fromMillis(meal.timestamp),
    });
};

export const getMealById = async (id: string): Promise<Meal | null> => {
    const mealRef = doc(db, 'meals', id);
    const snapshot = await getDoc(mealRef);
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const userIds = mealParticipants(data);
    const comments = normalizeComments(data.comments);
    const commentCount = typeof data.commentCount === 'number' ? data.commentCount : comments.length;

    return {
        id: snapshot.id,
        ...data,
        ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : undefined,
        userIds,
        comments,
        commentCount,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
    } as Meal;
};

export const updateMeal = async (id: string, updates: Partial<Omit<Meal, 'id'>>) => {
    const mealRef = doc(db, 'meals', id);
    const nextUpdates = { ...updates };
    delete (nextUpdates as { comments?: unknown }).comments;
    delete (nextUpdates as { commentCount?: unknown }).commentCount;
    const dataToUpdate: Record<string, unknown> = { ...nextUpdates };

    if (typeof nextUpdates.timestamp === 'number') {
        dataToUpdate.timestamp = Timestamp.fromMillis(nextUpdates.timestamp);
    }

    if (nextUpdates.description || nextUpdates.type || nextUpdates.userIds || nextUpdates.userId) {
        const snapshot = await getDoc(mealRef);
        const prev = snapshot.exists() ? (snapshot.data() as Partial<Meal>) : {};
        dataToUpdate.keywords = buildMealKeywords({
            description: nextUpdates.description ?? prev.description ?? '',
            type: nextUpdates.type ?? prev.type ?? DEFAULT_MEAL_TYPE,
            userIds: nextUpdates.userIds ?? prev.userIds,
            userId: nextUpdates.userId ?? prev.userId,
        });
    }

    await updateDoc(mealRef, dataToUpdate as DocumentData);
};

export const deleteMeal = async (id: string) => {
    const mealId = encodeURIComponent(id);
    await fetchAuthedJson<{ ok: true; deleted: boolean; status: string }>(`/api/meals/${mealId}`, {
        method: 'DELETE',
    });
};

const mealCommentsRef = (mealId: string) => collection(db, 'meals', mealId, 'comments');

export const getMealComments = async (mealId: string): Promise<MealComment[]> => {
    const q = query(mealCommentsRef(mealId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(convertCommentDoc)
        .filter((comment): comment is MealComment => Boolean(comment));
};

export const subscribeMealComments = (
    mealId: string,
    onComments: (comments: MealComment[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(mealCommentsRef(mealId), orderBy('createdAt', 'asc'));

    return onSnapshot(
        q,
        (snapshot) => {
            const comments = snapshot.docs
                .map(convertCommentDoc)
                .filter((comment): comment is MealComment => Boolean(comment));
            onComments(comments);
        },
        (error) => {
            console.error('Failed to subscribe to comments', error);
            onError?.(error);
        }
    );
};

export const addMealComment = async (
    mealId: string,
    _author: UserRole,
    _authorUid: string,
    text: string
): Promise<MealComment> => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Comment text is empty');

    const encodedMealId = encodeURIComponent(mealId);
    const response = await fetchAuthedJson<{ ok: true; comment: MealComment }>(
        `/api/meals/${encodedMealId}/comments`,
        {
            method: 'POST',
            body: JSON.stringify({ text: trimmed }),
        }
    );
    return response.comment;
};

export const updateMealComment = async (
    mealId: string,
    commentId: string,
    actorUid: string,
    text: string
): Promise<MealComment> => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Comment text is empty');
    if (!actorUid) throw new Error('Missing actor uid');

    const encodedMealId = encodeURIComponent(mealId);
    const encodedCommentId = encodeURIComponent(commentId);
    const response = await fetchAuthedJson<{ ok: true; comment: MealComment }>(
        `/api/meals/${encodedMealId}/comments/${encodedCommentId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ text: trimmed }),
        }
    );
    return response.comment;
};

export const deleteMealComment = async (
    mealId: string,
    commentId: string,
    actorUid: string
): Promise<void> => {
    if (!actorUid) throw new Error('Missing actor uid');

    const encodedMealId = encodeURIComponent(mealId);
    const encodedCommentId = encodeURIComponent(commentId);
    await fetchAuthedJson<{ ok: true }>(
        `/api/meals/${encodedMealId}/comments/${encodedCommentId}`,
        {
            method: 'DELETE',
        }
    );
};

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
            const { startOfDay: start, endOfDay: end } = getDayRange(date);

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
