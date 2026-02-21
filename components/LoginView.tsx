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
            <div className="flex flex-col min-h-[100dvh] bg-white px-7 pt-16 pb-12 font-sans dark:bg-[#121212]">
                {/* Top Logo Section */}
                <div className="flex justify-center items-center gap-2 mb-10 mt-8">
                    <div className="flex items-center justify-center w-[46px] h-[46px] bg-green-50 rounded-[14px] shadow-sm border border-green-100 dark:bg-green-900/20 dark:border-green-800/50">
                        <span className="text-2xl" style={{ transform: 'translateY(1px)' }}>🍽️</span>
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-[26px] font-bold text-green-600 dark:text-green-500 leading-none tracking-tight">Family<span className="text-gray-900 dark:text-white">Meal</span></h1>
                        <p className="text-[11px] text-gray-500 font-medium mt-1 tracking-wide dark:text-gray-400">Dinner is Ready</p>
                    </div>
                </div>

                {/* Welcome Text Section */}
                <div className="mb-8">
                    <h2 className="text-[28px] font-bold text-gray-900 mb-2.5 tracking-tight dark:text-white">Welcome</h2>
                    <p className="text-[#6b7280] text-[15px] leading-[1.4] dark:text-gray-400">
                        To get started, please sign in using your<br />username and password.
                    </p>
                </div>

                {authError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[13px] border border-red-100 mb-6 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
                        {authError}
                    </div>
                )}

                {/* Fake Form Elements matching the design */}
                <div className="flex flex-col gap-5 mb-8">
                    <div>
                        <label className="block text-[13px] font-bold text-gray-900 mb-1.5 dark:text-gray-200">Email</label>
                        <input
                            type="email"
                            disabled
                            placeholder="Email address"
                            className="w-full px-4 py-[14px] rounded-[12px] border border-green-500 bg-white placeholder-gray-400 text-[15px] focus:outline-none dark:bg-[#121212] dark:border-green-600 dark:text-gray-300 dark:placeholder-gray-500 opacity-90"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-gray-900 mb-1.5 dark:text-gray-200">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                disabled
                                placeholder="Password"
                                className="w-full px-4 py-[14px] rounded-[12px] border border-gray-200 bg-white placeholder-gray-400 text-[15px] focus:outline-none dark:bg-[#121212] dark:border-zinc-800 dark:text-gray-300 dark:placeholder-gray-500 opacity-90"
                            />
                            {/* Eye icon dummy */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-[-8px]">
                        <span className="text-[13px] font-bold text-[#f59e0b] cursor-pointer hover:underline">Forget Password?</span>
                    </div>
                </div>

                <div className="mt-auto w-full flex flex-col items-center">
                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex justify-center items-center bg-black text-white dark:bg-white dark:text-black rounded-[24px] py-[16px] text-[16px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:bg-gray-800 active:scale-[0.98] transition-all mb-8"
                    >
                        Log in
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center w-full mb-8">
                        <div className="w-full border-t border-gray-100 dark:border-zinc-800"></div>
                        <span className="absolute px-4 bg-white text-[#9ca3af] text-[12px] dark:bg-[#121212] dark:text-gray-500">
                            or continue with
                        </span>
                    </div>

                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex justify-center items-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-[24px] py-[15px] text-[15px] font-bold hover:bg-[#e5e7eb] active:scale-[0.98] transition-all dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    >
                        <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Log in with Google
                    </button>

                    <p className="mt-8 text-[14px] text-gray-500 font-medium dark:text-gray-400 mb-2">
                        Are you new user? <span onClick={signInWithGoogle} className="text-[#10b981] font-bold cursor-pointer dark:text-green-500">Sign up</span>
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
