import { NextResponse } from 'next/server';
import { addMeal, getMealsForDate } from '@/lib/data';
import { Meal, UserRole } from '@/lib/types';
import { z } from 'zod';

const mealTypeSchema = z.enum(['아침', '점심', '저녁', '간식']);
const userRoleSchema = z.enum(['아빠', '엄마', '딸', '아들']);
const createMealSchema = z.object({
    userId: userRoleSchema.optional(),
    userIds: z.array(userRoleSchema).optional(),
    imageUrl: z.string().url().optional(),
    description: z.string().trim().min(1),
    type: mealTypeSchema,
    timestamp: z.number().int().positive().optional(),
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    const meals = await getMealsForDate(date);
    return NextResponse.json({ meals });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createMealSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
        }

        const userIds: UserRole[] = parsed.data.userIds?.length
            ? parsed.data.userIds
            : parsed.data.userId
                ? [parsed.data.userId]
                : [];

        if (!userIds.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newMeal: Omit<Meal, 'id'> = {
            userId: userIds[0],
            userIds,
            imageUrl: parsed.data.imageUrl,
            description: parsed.data.description,
            type: parsed.data.type,
            timestamp: parsed.data.timestamp || Date.now(),
        };

        await addMeal(newMeal);

        return NextResponse.json({ success: true, meal: newMeal });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
