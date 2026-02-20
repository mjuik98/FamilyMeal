"use client";

import { useEffect, useState } from 'react';
import { subscribeMealsForDate } from '@/lib/data';
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

  useEffect(() => {
    if (!userProfile?.role) return;

    setLoadingMeals(true);
    const unsubscribe = subscribeMealsForDate(
      selectedDate,
      (data) => {
        setMeals(data);
        setLoadingMeals(false);
      },
      (error) => {
        console.error("Failed to load meals", error);
        setLoadingMeals(false);
      }
    );

    return () => unsubscribe();
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

  const roleEmoji: Record<string, string> = {
    '아빠': '👨', '엄마': '👩', '딸': '👧', '아들': '👦'
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return '좋은 새벽이에요';
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  };

  return (
    <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>

      {/* Greeting Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'var(--muted)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.4rem'
          }}>
            {roleEmoji[userProfile.role] || '👤'}
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              {getGreeting()}
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {userProfile.role}
            </p>
          </div>
        </div>
        <button onClick={signOut}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted-foreground)', padding: '8px'
          }}>
          <LogOut size={20} />
        </button>
      </header>

      {/* Date Summary Card */}
      <div style={{
        background: 'var(--primary)', borderRadius: '20px', padding: '20px 24px',
        color: 'white', marginBottom: '24px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-20px', right: '-10px',
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-30px', right: '40px',
          width: '70px', height: '70px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)'
        }} />
        <p style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '4px' }}>
          {dateStr}
        </p>
        <p style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {loadingMeals ? '...' : `${meals.length}끼 기록됨`}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => setShowCalendar(!showCalendar)}
            style={{
              padding: '8px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: '0.8rem',
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
              backdropFilter: 'blur(4px)'
            }}>
            <CalendarIcon size={14} /> 날짜 선택
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(new Date())}
              style={{
                padding: '8px 16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: 500, backdropFilter: 'blur(4px)'
              }}>
              오늘로
            </button>
          )}
        </div>
      </div>

      {/* Calendar Dropdown */}
      {showCalendar && (
        <div style={{
          marginBottom: '20px', padding: '16px', background: 'var(--card)',
          borderRadius: '16px', border: '1px solid var(--border)',
        }}>
          <Calendar
            onChange={onDateChange}
            value={selectedDate}
            locale="ko-KR"
          />
        </div>
      )}

      {/* Meals Section */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          {isToday ? '오늘의 식사' : `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} 식사`}
        </h2>
        {meals.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            {meals.length}개
          </span>
        )}
      </div>

      {loadingMeals ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted" />
        </div>
      ) : meals.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--card)', borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--muted)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 16px'
          }}>🍽️</div>
          <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
            기록이 없어요
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {isToday ? '오늘 무엇을 드셨나요?' : '이 날은 기록이 없습니다'}
          </p>
          {isToday && (
            <Link href="/add" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '12px',
              background: 'var(--primary)', color: 'white',
              fontWeight: 600, fontSize: '0.9rem'
            }}>
              식사 추가하기
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
