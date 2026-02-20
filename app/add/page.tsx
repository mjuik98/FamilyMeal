"use client";

import { useUser } from '@/context/UserContext';
import { Meal, UserRole } from '@/lib/types';
import { Camera, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/Toast';

// Since we are using mock data in memory on server side (mostly), 
// but here we are in a client component, we can't directly call server functions if we want persistence across pages 
// without an API.
// HOWEVER, for this prototype, `lib/data.ts` is imported into the client bundle too if we are not careful.
// To make it work properly with Next.js App Router, we should use Server Actions or API routes.
// For simplicity in this step, I will create a Server Action or just use an API route.
// Let's use a simple API route for data mutation to avoid client/server state mismatch.
// Actually, `lib/data.ts` state is module-global. Next.js might separate server/client instances.
// We should use an API route to be safe.

// Let's quickly create app/api/meals/route.ts first? 
// Or just try to stick to "use server" actions?
// Let's use Server Actions for simplicity.

export default function AddMealPage() {
    const { userProfile } = useUser();
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [type, setType] = useState<Meal['type']>('점심');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    // Redirect if not logged in
    if (!userProfile?.role) {
        router.push('/');
        return null;
    }

    // Initialize selectedUsers with current user
    useEffect(() => {
        if (selectedUsers.length === 0 && userProfile?.role) {
            setSelectedUsers([userProfile.role]);
        }
    }, [userProfile?.role]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleUser = (role: UserRole) => {
        setSelectedUsers(prev => {
            if (prev.includes(role)) {
                // Don't allow deselecting the last user
                if (prev.length === 1) return prev;
                return prev.filter(r => r !== role);
            } else {
                return [...prev, role];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile?.role) return;

        setIsSubmitting(true);

        try {
            // Import dynamically or assuming it's safe since lib/data uses client SDK
            // We need to import addMeal from lib/data.ts at the top check
            const { addMeal, users } = await import('@/lib/data');
            const { uploadImage } = await import('@/lib/uploadImage');

            // Upload image to Firebase Storage if present
            let imageUrl: string | undefined;
            if (imagePreview) {
                imageUrl = await uploadImage(imagePreview);
            }

            await addMeal({
                userIds: selectedUsers,
                description,
                type,
                imageUrl,
                timestamp: Date.now(),
            });

            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Failed to add meal', error);
            showToast('식사 기록에 실패했습니다.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Need to import users list for rendering toggles. 
    // Since we are inside component, let's use a hardcoded list or import it.
    // Ideally import from lib/data but it might cause issues if not careful with server/client.
    // But lib/data is client-safe (firebase client sdk).
    const ROLES: UserRole[] = ['아빠', '엄마', '딸', '아들'];

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">식사 기록하기</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Image Upload */}
                <div
                    className="aspect-video bg-muted rounded-lg flex items-center justify-center cursor-pointer overflow-hidden relative border-2 border-dashed border-input hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {imagePreview ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                            >
                                <X size={16} />
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                            <Camera size={32} className="mb-2" />
                            <span className="text-sm">사진 촬영/선택</span>
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                />

                {/* Participants */}
                <div>
                    <label className="block text-sm font-medium mb-2">누구와 함께 먹었나요?</label>
                    <div className="flex gap-2 flex-wrap">
                        {ROLES.map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => toggleUser(role)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                                    ${selectedUsers.includes(role)
                                        ? 'bg-primary text-white ring-2 ring-offset-2 ring-primary'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                                `}
                            >
                                {role} {selectedUsers.includes(role) && '✓'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meal Type */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['아침', '점심', '저녁', '간식'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${type === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}
                        >
                            {t} {type === t && '✓'}
                        </button>
                    ))}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-2">설명</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="어떤 음식을 드셨나요?"
                        className="w-full p-3 rounded-lg border bg-card resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn w-full gap-2 text-lg"
                >
                    {isSubmitting ? '업로드 중...' : (
                        <>
                            <Send size={20} /> 기록하기
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
