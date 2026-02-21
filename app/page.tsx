"use client";

import { useEffect, useState } from 'react';
import { subscribeMealsForDate, getWeeklyStats, searchMeals } from '@/lib/data';
import MealCard from '@/components/MealCard';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import LoginView from '@/components/LoginView';
import { Meal } from '@/lib/types';
import { LogOut, Calendar as CalendarIcon, Search, Bell, X } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function Home() {
  const { user, userProfile, loading, signOut } = useUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<{ label: string; count: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Meal[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

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
      },
      userProfile.role
    );

    return () => unsubscribe();
  }, [userProfile?.role, selectedDate]);

  // Load weekly stats
  useEffect(() => {
    if (!userProfile?.role) return;
    getWeeklyStats(userProfile.role).then(setWeeklyStats).catch(console.error);
  }, [userProfile?.role]);

  // Check notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const results = await searchMeals(searchQuery.trim(), userProfile?.role ?? undefined);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const requestNotification = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === 'granted');
    if (perm === 'granted') {
      new Notification('가족 식사 기록 🍽️', {
        body: '알림이 활성화되었습니다!',
        icon: '/icons/icon.svg'
      });
    }
  };

  const onDateChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
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

      {/* Weekly Stats */}
      {weeklyStats.length > 0 && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: '16px',
          overflow: 'hidden', background: 'var(--card)', marginBottom: '16px'
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>📊 주간 기록</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              최근 7일
            </span>
          </div>
          <div style={{
            padding: '16px', display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-around', height: '120px', gap: '8px'
          }}>
            {weeklyStats.map((day, i) => {
              const maxCount = Math.max(...weeklyStats.map(d => d.count), 1);
              const heightPct = (day.count / maxCount) * 100;
              const isCurrentDay = i === weeklyStats.length - 1;
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flex: 1, gap: '6px'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {day.count}
                  </span>
                  <div style={{
                    width: '100%', maxWidth: '32px',
                    height: `${Math.max(heightPct, 8)}%`,
                    borderRadius: '6px',
                    background: isCurrentDay ? 'var(--primary)' : 'var(--muted)',
                    transition: 'height 0.3s ease',
                    minHeight: '4px'
                  }} />
                  <span style={{
                    fontSize: '0.7rem', fontWeight: isCurrentDay ? 700 : 400,
                    color: isCurrentDay ? 'var(--primary)' : 'var(--muted-foreground)'
                  }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification Prompt */}
      {!notifGranted && typeof Notification !== 'undefined' && Notification.permission !== 'denied' && (
        <button onClick={requestNotification}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '14px',
            background: 'var(--card)', border: '1px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '16px', textAlign: 'left'
          }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--muted)', display: 'flex', alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>알림 켜기</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', margin: 0 }}>
              식사 기록 알림을 받아보세요
            </p>
          </div>
        </button>
      )}

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '16px', padding: '10px 14px',
        borderRadius: '14px', border: '1px solid var(--border)',
        background: 'var(--card)'
      }}>
        <Search size={18} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        <input
          type="text" value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="음식, 사람 검색..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '0.9rem', fontFamily: 'inherit'
          }}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--muted-foreground)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchResults !== null ? (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              검색 결과
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              {searchResults.length}개
            </span>
          </div>
          {searching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted" />
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: 'var(--card)', borderRadius: '16px',
              border: '1px solid var(--border)'
            }}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                &ldquo;{searchQuery}&rdquo;에 대한 결과가 없습니다
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {searchResults.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
