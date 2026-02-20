import { NextResponse } from 'next/server';
import { addMeal, getMealsForDate } from '@/lib/data';
import { Meal, UserRole } from '@/lib/types';

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
        const userIds: UserRole[] = Array.isArray(body.userIds)
            ? body.userIds
            : body.userId
                ? [body.userId]
                : [];

        // Validate body
        if (!userIds.length || !body.description || !body.type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newMeal: Omit<Meal, 'id'> = {
            userId: userIds[0],
            userIds,
            imageUrl: body.imageUrl,
            description: body.description,
            type: body.type,
            timestamp: body.timestamp || Date.now(),
        };

        await addMeal(newMeal);

        return NextResponse.json({ success: true, meal: newMeal });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
