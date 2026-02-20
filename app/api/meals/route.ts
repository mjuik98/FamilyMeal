import { NextResponse } from 'next/server';
import { addMeal, getMealsForDate } from '@/lib/data';
import { Meal } from '@/lib/types';

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

        // Validate body
        if (!body.userId || !body.description || !body.type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newMeal: Meal = {
            id: Date.now().toString(),
            userId: body.userId,
            imageUrl: body.imageUrl,
            description: body.description,
            type: body.type,
            timestamp: body.timestamp || Date.now(),
        };

        addMeal(newMeal);

        return NextResponse.json({ success: true, meal: newMeal });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
