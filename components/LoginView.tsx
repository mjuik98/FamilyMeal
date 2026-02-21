"use client";

import { useUser } from '@/context/UserContext';
import { UserRole } from '@/lib/types';

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
            <div className="flex flex-col min-h-[100dvh] bg-white px-6 font-sans dark:bg-[#121212]">
                {/* Top Logo Section */}
                <div className="flex justify-center items-center gap-3 mt-[8vh] mb-12">
                    <div className="flex items-center justify-center w-[44px] h-[44px] bg-green-50 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-green-100 dark:bg-green-900/20 dark:border-green-800/50">
                        <img src="/images/nanobanana_logo.png" alt="나노바나나 로고" className="w-[32px] h-[32px] object-contain rounded-md" />
                    </div>
                    <div className="flex flex-col justify-center text-center">
                        <h1 className="text-[22px] font-extrabold text-[#10b981] dark:text-[#34d399] tracking-tight leading-none mb-0.5">가족식사</h1>
                        <p className="text-[11px] text-gray-500 font-medium dark:text-gray-400 leading-none">함께 쓰는 맛있는 기록</p>
                    </div>
                </div>

                {/* Welcome Text Section */}
                <div className="mb-12 text-center">
                    <h2 className="text-[28px] font-bold text-gray-900 mb-2.5 tracking-tight dark:text-white">환영합니다!</h2>
                    <p className="text-gray-500 text-[15px] leading-relaxed dark:text-gray-400">
                        시작하려면 구글 계정으로<br />로그인해 주세요.
                    </p>
                </div>

                {authError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 mb-6 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400 font-medium">
                        {authError}
                    </div>
                )}

                <div className="mt-auto w-full flex flex-col items-center pb-8">
                    {/* Google Button */}
                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex justify-center items-center gap-3 bg-[#f8fafc] dark:bg-zinc-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 rounded-full py-4 text-[16px] font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google 계정으로 시작하기
                    </button>

                    <p className="mt-6 text-[13px] text-gray-400 font-medium dark:text-gray-500">
                        안전하게 로그인 정보가 보호됩니다.
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
