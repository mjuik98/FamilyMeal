"use client";

import { useUser } from '@/context/UserContext';
import { Meal, UserRole } from '@/lib/types';
import { Camera, Save, X } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/Toast';

export default function EditMealPage() {
    const { userProfile } = useUser();
    const router = useRouter();
    const params = useParams();
    const mealId = params.id as string;

    const [description, setDescription] = useState('');
    const [type, setType] = useState<Meal['type']>('점심');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        const loadMeal = async () => {
            try {
                const { getMealById } = await import('@/lib/data');
                const meal = await getMealById(mealId);
                if (!meal) {
                    alert('해당 기록을 찾을 수 없습니다.');
                    router.push('/');
                    return;
                }
                setDescription(meal.description);
                setType(meal.type);
                setImagePreview(meal.imageUrl || null);
                setSelectedUsers(meal.userIds || []);
            } catch (error) {
                console.error('Failed to load meal', error);
                alert('기록을 불러오는 데 실패했습니다.');
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        loadMeal();
    }, [mealId, router]);

    // Redirect if not logged in
    if (!userProfile?.role) {
        router.push('/');
        return null;
    }

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
            const { updateMeal } = await import('@/lib/data');
            const { uploadImage } = await import('@/lib/uploadImage');

            // Upload new image to Storage if it's a base64 data URI (not an existing URL)
            let imageUrl: string | undefined = imagePreview || undefined;
            if (imagePreview && imagePreview.startsWith('data:')) {
                imageUrl = await uploadImage(imagePreview);
            }

            await updateMeal(mealId, {
                userIds: selectedUsers,
                description,
                type,
                imageUrl,
            });

            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Failed to update meal', error);
            showToast('수정에 실패했습니다.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ROLES: UserRole[] = ['아빠', '엄마', '딸', '아들'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">기록 수정하기</h1>

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
                    {isSubmitting ? '수정 중...' : (
                        <>
                            <Save size={20} /> 수정 완료
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
