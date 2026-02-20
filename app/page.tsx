"use client";

import { useEffect, useState } from 'react';
import { getMealsForDate } from '@/lib/data';
import MealCard from '@/components/MealCard';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import LoginView from '@/components/LoginView';
import { Meal } from '@/lib/types';
import { RefreshCw, LogOut, Calendar as CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function Home() {
  const { user, userProfile, loading, signOut } = useUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const loadMeals = async () => {
    setLoadingMeals(true);
    try {
      const data = await getMealsForDate(selectedDate);
      setMeals(data);
    } catch (error) {
      console.error("Failed to load meals", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role) {
      loadMeals();
    }
  }, [userProfile?.role, selectedDate]);

  const onDateChange = (value: any) => {
    setSelectedDate(value);
    setShowCalendar(false); // Close calendar after selection
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in or no role selected
  if (!user || !userProfile?.role) {
    return <LoginView />;
  }

  const dateStr = selectedDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const isToday = new Date().toDateString() === selectedDate.toDateString();

  return (
    <div className="p-4 pb-24">
      <header className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="flex flex-col items-start hover:opacity-70 transition-opacity"
        >
          <h1 className="mb-0 text-xl font-bold flex items-center gap-2">
            가족 식사 기록
            {showCalendar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </h1>
          <p className="text-sm text-muted">{dateStr}</p>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(new Date())} className={`p-2 ${isToday ? 'text-primary font-bold' : 'text-muted'}`} title="오늘">
            오늘
          </button>
          <button onClick={signOut} className="p-2 text-muted hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {showCalendar && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border animate-in fade-in slide-in-from-top-4">
          <Calendar
            onChange={onDateChange}
            value={selectedDate}
            locale="ko-KR"
            className="w-full border-none"
            tileClassName={({ date, view }) => {
              if (view === 'month' && date.toDateString() === new Date().toDateString()) {
                return 'text-primary font-bold';
              }
              return '';
            }}
          />
        </div>
      )}

      {loadingMeals ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted"></div>
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl">
            🍽️
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">기록이 없어요</h3>
            <p className="text-muted max-w-[200px]">
              {isToday ? "오늘 무엇을 드셨나요? 가장 먼저 공유해보세요!" : "이 날은 기록된 식사가 없습니다."}
            </p>
          </div>
          {isToday && (
            <Link href="/add" className="btn mt-4">
              식사 추가하기
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
