"use client";

import { useUser } from '@/context/UserContext';
import { UserRole } from '@/lib/types';
import { LogIn, UserCircle } from 'lucide-react';

const ROLES: { role: UserRole; emoji: string; label: string }[] = [
    { role: '아빠', emoji: '👨', label: '아빠' },
    { role: '엄마', emoji: '👩', label: '엄마' },
    { role: '딸', emoji: '👧', label: '딸' },
    { role: '아들', emoji: '👦', label: '아들' },
];

export default function LoginView() {
    const { user, userProfile, signInWithGoogle, selectRole, loading } = useUser();

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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-4 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">우리 가족 식사 기록 🍽️</h1>
                    <p className="text-muted">가족들과 함께 맛있는 추억을 남겨보세요</p>
                </div>

                <button
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 btn btn-primary px-8 py-4 text-lg"
                >
                    <LogIn size={24} />
                    Google로 시작하기
                </button>
            </div>
        );
    }

    // 2. Signed in but no role selected
    if (!userProfile?.role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-4 text-center">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">반가워요! 👋</h2>
                    <p className="text-muted">가족 중 누구신가요?</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    {ROLES.map(({ role, emoji, label }) => (
                        <button
                            key={role}
                            onClick={() => selectRole(role)}
                            className="flex flex-col items-center gap-2 p-6 bg-card rounded-xl border-2 border-transparent hover:border-primary transition-all shadow-sm"
                        >
                            <span className="text-4xl">{emoji}</span>
                            <span className="font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Should not happen if parent handles showing content when role is present
    return null;
}
