"use client";

import { useUser } from '@/context/UserContext';
import { UserRole } from '@/lib/types';
import { LogIn } from 'lucide-react';

const ROLES: { role: UserRole; emoji: string; label: string; roleClass: string }[] = [
    { role: '아빠', emoji: '👨', label: '아빠', roleClass: 'role-dad' },
    { role: '엄마', emoji: '👩', label: '엄마', roleClass: 'role-mom' },
    { role: '딸', emoji: '👧', label: '딸', roleClass: 'role-daughter' },
    { role: '아들', emoji: '👦', label: '아들', roleClass: 'role-son' },
];

export default function LoginView() {
    const { user, userProfile, signInWithGoogle, selectRole, loading, authError } = useUser();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted">로딩 중...</p>
            </div>
        );
    }

    // 1. Not signed in
    if (!user) {
        return (
            <div className="flex flex-col min-h-[85vh] px-5 pt-12 pb-10">
                {/* Header-like section */}
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">우리 가족의 식사 일기</p>
                        <h1 className="text-xl font-bold">환영합니다! 👋</h1>
                    </div>
                </header>

                {/* Main Card */}
                <div className="bg-primary rounded-[20px] p-6 text-white mb-8 relative overflow-hidden shadow-sm">
                    {/* Decorative circles matching main page */}
                    <div className="absolute -top-[20px] -right-[10px] w-[100px] h-[100px] rounded-full bg-white/10" />
                    <div className="absolute -bottom-[30px] right-[40px] w-[70px] h-[70px] rounded-full bg-[rgba(255,255,255,0.07)]" />
                    
                    <p className="text-sm opacity-85 mb-2 font-medium">가족 식사 기록 🍽️</p>
                    <p className="text-[1.6rem] font-extrabold tracking-tight leading-snug">
                        가족들과 함께<br/>
                        맛있는 추억을<br/>
                        남겨보세요
                    </p>
                </div>

                {authError && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800 animate-in fade-in mb-6">
                        {authError}
                    </div>
                )}

                <div className="mt-auto mb-4">
                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex justify-center items-center gap-3 bg-white text-gray-800 border border-gray-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 shadow-sm rounded-[16px] px-6 py-4 text-[1.05rem] font-bold hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
                    >
                        {/* Using custom google icon approach instead of generic LogIn if possible, but keep LogIn for now as per original */}
                        <LogIn size={22} className="text-primary" />
                        Google로 시작하기
                    </button>
                </div>
            </div>
        );
    }

    // 2. Signed in but no role selected
    if (!userProfile?.role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-7 p-4 text-center animate-in">
                <div className="space-y-3">
                    <h2 className="text-3xl font-extrabold tracking-tight">반가워요! 👋</h2>
                    <p className="text-lg text-muted-foreground">가족 중 누구신가요?</p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mx-auto">
                    {ROLES.map(({ role, emoji, label, roleClass }) => (
                        <button
                            key={role}
                            onClick={() => selectRole(role)}
                            className={`role-btn ${roleClass}`}
                        >
                            <span className="emoji-wrapper">{emoji}</span>
                            <span className="label-wrapper">{label}</span>
                            <div className="absolute inset-0 opacity-0 hover:opacity-10 dark:hover:opacity-20 transition-opacity pointer-events-none"
                                style={{ backgroundColor: 'var(--role-color)' }} />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Should not happen if parent handles showing content when role is present
    return null;
}
