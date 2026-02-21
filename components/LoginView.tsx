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
            <div className="flex flex-col min-h-[100dvh] bg-white px-7 pt-20 pb-12 font-sans dark:bg-[#121212]">
                {/* Top Logo Section */}
                <div className="flex flex-col items-center mb-16">
                    <div className="flex items-center justify-center w-[60px] h-[60px] bg-green-50 rounded-2xl mb-3 shadow-sm border border-green-100 dark:bg-green-900/20 dark:border-green-800/50">
                        <span className="text-3xl">🍽️</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <h1 className="text-[28px] font-bold text-green-600 tracking-tight dark:text-green-500">Family Meal</h1>
                    </div>
                    <p className="text-[13px] text-gray-500 font-medium mt-1 tracking-wide dark:text-gray-400">가족 식사 기록</p>
                </div>

                {/* Welcome Text Section */}
                <div className="mb-12">
                    <h2 className="text-[32px] font-bold text-gray-900 mb-3 tracking-tight dark:text-white">환영합니다</h2>
                    <p className="text-gray-500 text-[15px] leading-relaxed dark:text-gray-400">
                        가족들과 함께 맛있는 추억을 남겨보세요.<br />시작하려면 아래 버튼을 눌러 로그인해주세요.
                    </p>
                </div>

                {authError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 mb-6 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
                        {authError}
                    </div>
                )}

                <div className="mt-auto w-full flex flex-col gap-6">
                    {/* Divider */}
                    <div className="relative flex items-center justify-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                        <span className="absolute px-4 bg-white text-gray-400 text-[13px] dark:bg-[#121212] dark:text-gray-500">or continue with</span>
                    </div>

                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex justify-center items-center gap-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-full py-[16px] text-[16px] font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-800"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google로 시작하기
                    </button>

                    <p className="text-center text-[14px] text-gray-500 mt-2 dark:text-gray-400">
                        처음이신가요? <span onClick={signInWithGoogle} className="text-green-600 font-semibold cursor-pointer dark:text-green-500">Sign up</span>
                    </p>
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
