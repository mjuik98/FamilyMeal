import { ActivityFeedItem, Meal, MealComment, NotificationPreferences, UserActivity, UserRole, WeeklyMealStat } from './types';
import { convertActivityDoc, normalizeNotificationPreferences, toActivityFeedItem } from './activity';
import { isReactionEmoji, normalizeReactionMap } from './reactions';
import { auth, db } from './firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    getDoc,
    doc,
    onSnapshot,
    limit,
    DocumentData,
    QueryDocumentSnapshot,
    writeBatch,
} from 'firebase/firestore';

export const users: UserRole[] = ['아빠', '엄마', '딸', '아들'];

export type MealUpdateInput = Partial<Omit<Meal, 'id' | 'imageUrl'>> & {
    imageUrl?: string | null;
};

const MAX_MEAL_DESCRIPTION_LENGTH = 300;
const SEARCH_INDEX_LIMIT = 300;
const SEARCH_FALLBACK_LIMIT = 300;
const VALID_MEAL_TYPES: Meal['type'][] = ['아침', '점심', '저녁', '간식'];

const getAccessToken = async (forceRefresh = false): Promise<string> => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }
    return user.getIdToken(forceRefresh);
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
    const requestWithToken = async (forceRefresh = false): Promise<Response> => {
        const token = await getAccessToken(forceRefresh);
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        if (!headers.has('Content-Type') && init?.body) {
            headers.set('Content-Type', 'application/json');
        }

        return fetch(input, {
            ...init,
            headers,
            cache: 'no-store',
        });
    };

    let response = await requestWithToken(false);
    if (response.status === 401) {
        response = await requestWithToken(true);
    }

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
        parentId: typeof raw.parentId === 'string' && raw.parentId.trim().length > 0 ? raw.parentId : undefined,
        mentionedAuthor: typeof raw.mentionedAuthor === 'string' ? raw.mentionedAuthor as UserRole : undefined,
        createdAt,
        updatedAt,
        timestamp,
        reactions: normalizeReactionMap((raw as { reactions?: unknown }).reactions),
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

const userActivitiesRef = (uid: string) => collection(db, 'users', uid, 'activity');

const mealParticipants = (mealData: Partial<Meal> & { userIds?: unknown; userId?: unknown }): UserRole[] => {
    if (Array.isArray(mealData.userIds)) {
        return mealData.userIds.filter((role): role is UserRole => typeof role === 'string' && users.includes(role as UserRole));
    }
    if (typeof mealData.userId === 'string' && users.includes(mealData.userId as UserRole)) {
        return [mealData.userId as UserRole];
    }
    return [];
};

const normalizeKeywords = (rawKeywords: unknown): string[] | undefined => {
    if (!Array.isArray(rawKeywords)) return undefined;

    const keywords = rawKeywords
        .filter((keyword): keyword is string => typeof keyword === 'string' && keyword.trim().length > 0)
        .map((keyword) => keyword.trim());

    return keywords.length > 0 ? keywords : undefined;
};

const normalizeMealType = (value: unknown): Meal['type'] =>
    typeof value === 'string' && VALID_MEAL_TYPES.includes(value as Meal['type'])
        ? value as Meal['type']
        : '점심';

const normalizeCommentCount = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : fallback;

const normalizeMealDescription = (description: string): string => {
    const trimmed = description.trim();
    if (!trimmed) {
        throw new Error('Meal description is empty');
    }
    if (trimmed.length > MAX_MEAL_DESCRIPTION_LENGTH) {
        throw new Error(`Meal description must be <= ${MAX_MEAL_DESCRIPTION_LENGTH} characters`);
    }
    return trimmed;
};

const matchesKeyword = (meal: Meal, keyword: string): boolean => {
    const lower = keyword.toLowerCase();
    return meal.description.toLowerCase().includes(lower) ||
        meal.type.toLowerCase().includes(lower) ||
        Boolean(meal.userIds?.some((u) => u.toLowerCase().includes(lower))) ||
        Boolean(meal.keywords?.some((k) => k.includes(lower)));
};

const serializeMealSnapshot = (
    id: string,
    data: Partial<Meal> & {
        ownerUid?: unknown;
        userId?: unknown;
        userIds?: unknown;
        keywords?: unknown;
        imageUrl?: unknown;
        description?: unknown;
        type?: unknown;
        timestamp?: unknown;
        commentCount?: unknown;
        comments?: unknown;
        reactions?: unknown;
    }
): Meal => {
    const userIds = mealParticipants(data);
    const comments = normalizeComments(data.comments);
    const commentCount = normalizeCommentCount(data.commentCount, comments.length);

    return {
        id,
        ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : undefined,
        userId: typeof data.userId === 'string' && users.includes(data.userId as UserRole)
            ? data.userId as UserRole
            : undefined,
        userIds,
        keywords: normalizeKeywords(data.keywords),
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
        description: typeof data.description === 'string' ? data.description : '',
        type: normalizeMealType(data.type),
        timestamp: toMillis(data.timestamp, Date.now()),
        comments,
        commentCount,
        reactions: normalizeReactionMap(data.reactions),
    };
};

const convertMeal = (docSnap: QueryDocumentSnapshot<DocumentData>): Meal =>
    serializeMealSnapshot(docSnap.id, docSnap.data());

const getDayRange = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
};

const getDayKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

export const getRecentMeals = async (maxResults = 40): Promise<Meal[]> => {
    const mealsRef = collection(db, 'meals');
    const q = query(mealsRef, orderBy('timestamp', 'desc'), limit(maxResults));
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

export const addMeal = async (meal: Omit<Meal, 'id'>): Promise<Meal> => {
    if (!meal.ownerUid) {
        throw new Error('ownerUid is required');
    }
    const normalizedDescription = normalizeMealDescription(meal.description);

    const response = await fetchAuthedJson<{ ok: true; meal: Meal }>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({
            userIds: meal.userIds,
            description: normalizedDescription,
            type: meal.type,
            imageUrl: meal.imageUrl,
            timestamp: meal.timestamp,
        }),
    });

    return response.meal;
};

export const getMealById = async (id: string): Promise<Meal | null> => {
    const mealRef = doc(db, 'meals', id);
    const snapshot = await getDoc(mealRef);
    if (!snapshot.exists()) return null;

    return serializeMealSnapshot(snapshot.id, snapshot.data());
};

export const updateMeal = async (id: string, updates: MealUpdateInput): Promise<Meal> => {
    const nextUpdates = { ...updates };
    if (typeof nextUpdates.description === 'string') {
        nextUpdates.description = normalizeMealDescription(nextUpdates.description);
    }
    delete (nextUpdates as { comments?: unknown }).comments;
    delete (nextUpdates as { commentCount?: unknown }).commentCount;
    delete (nextUpdates as { reactions?: unknown }).reactions;
    delete (nextUpdates as { timestamp?: unknown }).timestamp;
    delete (nextUpdates as { userId?: unknown }).userId;

    const encodedMealId = encodeURIComponent(id);
    const response = await fetchAuthedJson<{ ok: true; meal: Meal }>(
        `/api/meals/${encodedMealId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(nextUpdates),
        }
    );

    return response.meal;
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
    text: string,
    options?: { parentId?: string }
): Promise<MealComment> => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Comment text is empty');

    const encodedMealId = encodeURIComponent(mealId);
    const response = await fetchAuthedJson<{ ok: true; comment: MealComment }>(
        `/api/meals/${encodedMealId}/comments`,
        {
            method: 'POST',
            body: JSON.stringify({ text: trimmed, parentId: options?.parentId }),
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

export const subscribeUserActivity = (
    uid: string,
    onActivities: (activities: UserActivity[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(userActivitiesRef(uid), orderBy('createdAt', 'desc'), limit(30));

    return onSnapshot(
        q,
        (snapshot) => {
            const activities = snapshot.docs
                .map(convertActivityDoc)
                .filter((activity): activity is UserActivity => Boolean(activity));
            onActivities(activities);
        },
        (error) => {
            console.error('Failed to subscribe to activities', error);
            onError?.(error);
        }
    );
};

export const markAllActivitiesRead = async (uid: string, activityIds: string[]): Promise<void> => {
    if (!uid || activityIds.length === 0) return;

    const batch = writeBatch(db);
    const readAt = Timestamp.fromMillis(Date.now());
    activityIds.forEach((activityId) => {
        batch.update(doc(db, 'users', uid, 'activity', activityId), {
            readAt,
        });
    });
    await batch.commit();
};

export const updateNotificationPreferences = async (
    preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
    const response = await fetchAuthedJson<{ ok: true; profile: { notificationPreferences?: unknown } }>(
        '/api/profile/settings',
        {
            method: 'POST',
            body: JSON.stringify({ notificationPreferences: preferences }),
        }
    );

    return normalizeNotificationPreferences(response.profile?.notificationPreferences);
};

export const toggleMealReaction = async (
    mealId: string,
    emoji: string
) => {
    if (!isReactionEmoji(emoji)) {
        throw new Error('Invalid reaction emoji');
    }

    const encodedMealId = encodeURIComponent(mealId);
    const response = await fetchAuthedJson<{ ok: true; reactions: Meal['reactions'] }>(
        `/api/meals/${encodedMealId}/reactions`,
        {
            method: 'POST',
            body: JSON.stringify({ emoji }),
        }
    );
    return normalizeReactionMap(response.reactions);
};

export const toggleMealCommentReaction = async (
    mealId: string,
    commentId: string,
    emoji: string
) => {
    if (!isReactionEmoji(emoji)) {
        throw new Error('Invalid reaction emoji');
    }

    const encodedMealId = encodeURIComponent(mealId);
    const encodedCommentId = encodeURIComponent(commentId);
    const response = await fetchAuthedJson<{ ok: true; reactions: MealComment['reactions'] }>(
        `/api/meals/${encodedMealId}/comments/${encodedCommentId}/reactions`,
        {
            method: 'POST',
            body: JSON.stringify({ emoji }),
        }
    );
    return normalizeReactionMap(response.reactions);
};

export const getWeeklyStats = async (referenceDate: Date = new Date()): Promise<WeeklyMealStat[]> => {
    const now = new Date(referenceDate);
    now.setHours(12, 0, 0, 0);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const dates = Array.from({ length: 7 }, (_, idx) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + idx);
        return d;
    });

    const firstRange = getDayRange(dates[0]);
    const lastRange = getDayRange(dates[dates.length - 1]);

    const mealsRef = collection(db, 'meals');
    const q = query(
        mealsRef,
        where('timestamp', '>=', Timestamp.fromDate(firstRange.startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(lastRange.endOfDay))
    );
    const snapshot = await getDocs(q);

    const countByDay = new Map<string, number>();
    const previewByDay = new Map<string, string>();
    dates.forEach((date) => {
        countByDay.set(getDayKey(date), 0);
    });

    snapshot.docs.forEach((docSnap) => {
        const meal = convertMeal(docSnap);
        const key = getDayKey(new Date(meal.timestamp));
        if (!countByDay.has(key)) return;
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
        if (!previewByDay.has(key) && typeof meal.imageUrl === 'string' && meal.imageUrl.length > 0) {
            previewByDay.set(key, meal.imageUrl);
        }
    });

    return dates.map((date) => {
        const key = getDayKey(date);
        return {
            date,
            label: dayNames[date.getDay()],
            count: countByDay.get(key) ?? 0,
            previewImageUrl: previewByDay.get(key),
        };
    });
};

export const countMealReactions = (meal: Meal): number =>
    Object.values(normalizeReactionMap(meal.reactions))
        .reduce((sum, users) => sum + (users?.length ?? 0), 0);

export const countCommentReactions = (comments: MealComment[]): number =>
    comments.reduce(
        (sum, comment) =>
            sum + Object.values(normalizeReactionMap(comment.reactions)).reduce((inner, users) => inner + (users?.length ?? 0), 0),
        0
    );

export type MealSortOrder = 'recent' | 'comments' | 'reactions' | 'activity';

const getMealCommentsSnapshot = (
    meal: Meal,
    commentsByMeal?: Record<string, MealComment[]>
): MealComment[] => commentsByMeal?.[meal.id] ?? meal.comments ?? [];

export const getMealCommentCount = (
    meal: Meal,
    commentsByMeal?: Record<string, MealComment[]>
): number => commentsByMeal?.[meal.id]?.length ?? meal.commentCount ?? meal.comments?.length ?? 0;

const getMealEngagementCount = (
    meal: Meal,
    commentsByMeal?: Record<string, MealComment[]>
): number => countMealReactions(meal) + countCommentReactions(getMealCommentsSnapshot(meal, commentsByMeal));

export const mapUserActivitiesToFeedItems = (activities: UserActivity[]): ActivityFeedItem[] =>
    activities.map(toActivityFeedItem);

export const filterAndSortMeals = (
    meals: Meal[],
    options: {
        query?: string;
        type?: Meal['type'] | '전체';
        participant?: UserRole | '전체';
        sort?: MealSortOrder;
        ownerUid?: string;
        mineOnly?: boolean;
        engagedOnly?: boolean;
        minimumComments?: number;
        minimumReactions?: number;
        commentsByMeal?: Record<string, MealComment[]>;
    }
): Meal[] => {
    const normalizedQuery = options.query?.trim().toLowerCase() ?? '';
    const filtered = meals.filter((meal) => {
        const matchesQuery =
            !normalizedQuery ||
            meal.description.toLowerCase().includes(normalizedQuery) ||
            meal.type.toLowerCase().includes(normalizedQuery) ||
            Boolean(meal.userIds?.some((uid) => uid.toLowerCase().includes(normalizedQuery)));

        const matchesType = !options.type || options.type === '전체' || meal.type === options.type;
        const matchesParticipant =
            !options.participant ||
            options.participant === '전체' ||
            Boolean(meal.userIds?.includes(options.participant));
        const matchesMineOnly = !options.mineOnly || (Boolean(options.ownerUid) && meal.ownerUid === options.ownerUid);
        const minimumComments = options.minimumComments ?? 0;
        const minimumReactions = options.minimumReactions ?? 0;
        const matchesCommentThreshold = minimumComments <= 0 || getMealCommentCount(meal, options.commentsByMeal) >= minimumComments;
        const matchesEngagedOnly = !options.engagedOnly || getMealEngagementCount(meal, options.commentsByMeal) > 0;
        const matchesReactionThreshold = minimumReactions <= 0 || getMealEngagementCount(meal, options.commentsByMeal) >= minimumReactions;

        return matchesQuery && matchesType && matchesParticipant && matchesMineOnly && matchesCommentThreshold && matchesEngagedOnly && matchesReactionThreshold;
    });

    const sorted = [...filtered];
    const sort = options.sort ?? 'recent';
    sorted.sort((a, b) => {
        if (sort === 'comments') {
            return (b.commentCount ?? 0) - (a.commentCount ?? 0) || b.timestamp - a.timestamp;
        }
        if (sort === 'reactions') {
            return countMealReactions(b) - countMealReactions(a) || b.timestamp - a.timestamp;
        }
        if (sort === 'activity') {
            return getMealEngagementCount(b, options.commentsByMeal) - getMealEngagementCount(a, options.commentsByMeal) || b.timestamp - a.timestamp;
        }
        return b.timestamp - a.timestamp;
    });
    return sorted;
};

export const searchMeals = async (keyword: string): Promise<Meal[]> => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return [];

    const mealsRef = collection(db, 'meals');
    const searchTokens = Array.from(
        new Set(
            normalized
                .split(/\s+/)
                .map((token) => token.trim())
                .filter((token) => token.length >= 2)
        )
    ).slice(0, 10);

    try {
        if (searchTokens.length > 0) {
            const indexedQuery = query(
                mealsRef,
                where('keywords', 'array-contains-any', searchTokens),
                limit(SEARCH_INDEX_LIMIT)
            );
            const indexedSnapshot = await getDocs(indexedQuery);
            const indexedMeals = indexedSnapshot.docs.map(convertMeal);
            if (indexedMeals.length > 0) {
                return indexedMeals
                    .filter((meal) => matchesKeyword(meal, normalized))
                    .sort((a, b) => b.timestamp - a.timestamp);
            }
        }
    } catch (error) {
        console.warn('Indexed search failed, falling back to full scan', error);
    }

    const fallbackQuery = query(mealsRef, orderBy('timestamp', 'desc'), limit(SEARCH_FALLBACK_LIMIT));
    const fallbackSnapshot = await getDocs(fallbackQuery);
    const all = fallbackSnapshot.docs.map(convertMeal);
    return all.filter((meal) => matchesKeyword(meal, normalized));
};
