"use client";

import { useUser } from '@/context/UserContext';
import { users } from '@/lib/data';
import { UserRole } from '@/lib/types';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
    const { userProfile, selectRole, user } = useUser();
    const router = useRouter();

    // If not logged in, redirect to home (login)
    useEffect(() => {
        if (!user && !userProfile) {
            router.push('/');
        }
    }, [user, userProfile, router]);

    if (!user) return null;

    return (
        <div className="p-4">
            <h1>누구신가요?</h1>
            <p className="text-muted mb-6">식사를 기록하려면 프로필을 선택해주세요.</p>

            <div className="flex flex-col gap-4">
                {users.map((role) => (
                    <button
                        key={role}
                        onClick={() => selectRole(role)}
                        className={`
              relative p-4 rounded-lg border text-left flex items-center gap-4 transition-all
              ${userProfile?.role === role ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'bg-card hover:bg-muted'}
            `}
                    >
                        <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
              ${userProfile?.role === role ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
            `}>
                            {role === '아빠' ? '👨' : role === '엄마' ? '👩' : role === '딸' ? '👧' : '👦'}
                        </div>

                        <div className="flex-1">
                            <span className="font-bold text-lg block">{role}</span>
                        </div>

                        {userProfile?.role === role && (
                            <Check className="text-primary" size={24} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
