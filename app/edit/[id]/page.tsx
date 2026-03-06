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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [needsOwnerAdoption, setNeedsOwnerAdoption] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (!userProfile?.role) {
            router.replace('/');
            return;
        }

        const loadMeal = async () => {
            try {
                const { getMealById } = await import('@/lib/data');
                const meal = await getMealById(mealId);
                if (!meal) {
                    showToast('해당 기록을 찾을 수 없습니다.', 'error');
                    router.push('/');
                    return;
                }

                if (meal.ownerUid && meal.ownerUid !== userProfile.uid) {
                    showToast('작성자만 수정할 수 있습니다.', 'error');
                    router.push('/');
                    return;
                }

                setDescription(meal.description);
                setType(meal.type);
                setImagePreview(meal.imageUrl || null);
                setSelectedUsers(meal.userIds?.length ? meal.userIds : userProfile.role ? [userProfile.role] : []);
                setNeedsOwnerAdoption(!meal.ownerUid);
            } catch (error) {
                console.error('Failed to load meal', error);
                showToast('기록을 불러오지 못했습니다.', 'error');
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        void loadMeal();
    }, [mealId, router, showToast, userProfile]);

    if (!userProfile?.role) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const toggleUser = (role: UserRole) => {
        setSelectedUsers((prev) => {
            if (prev.includes(role)) {
                if (prev.length === 1) return prev;
                return prev.filter((r) => r !== role);
            }
            return [...prev, role];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile?.role) return;
        const normalizedDescription = description.trim();
        if (!normalizedDescription) {
            showToast('설명을 입력해 주세요.', 'error');
            return;
        }
        if (normalizedDescription.length > 300) {
            showToast('설명은 300자 이하로 입력해 주세요.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const { updateMeal } = await import('@/lib/data');
            const { uploadImage } = await import('@/lib/uploadImage');

            let imageUrl: string | undefined = imagePreview || undefined;
            if (imagePreview && imagePreview.startsWith('data:')) {
                imageUrl = await uploadImage(imagePreview);
            }

            await updateMeal(mealId, {
                ...(needsOwnerAdoption ? { ownerUid: userProfile.uid } : {}),
                userIds: selectedUsers,
                description: normalizedDescription,
                type,
                imageUrl,
            });

            showToast('수정되었습니다.', 'success');
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
            <div className="flex items-cent    return (
        <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
                기록 수정하기
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '24px' }}>
                기록된 내용을 수정해보세요
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--card)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>사진</span>
                        {imagePreview && (
                            <button
                                type="button"
                                onClick={() => {
                                    setImagePreview(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                삭제
                            </button>
                        )}
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--muted)', position: 'relative' }}
                    >
                        {imagePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--muted-foreground)', gap: '8px' }}>
                                <Camera size={36} strokeWidth={1.5} />
                                <span style={{ fontSize: '0.85rem' }}>눌러서 사진 추가</span>
                            </div>
                        )}
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />

                <div style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--card)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>식사 정보</span>
                    </div>

                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>식사 종류</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['아침', '점심', '저녁', '간식'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: type === t ? 600 : 400,
                                        background: type === t ? 'var(--primary)' : 'var(--muted)',
                                        color: type === t ? 'white' : 'var(--muted-foreground)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>함께 먹은 사람</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {ROLES.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => toggleUser(role)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: selectedUsers.includes(role) ? 600 : 400,
                                        background: selectedUsers.includes(role) ? 'var(--primary)' : 'var(--muted)',
                                        color: selectedUsers.includes(role) ? 'white' : 'var(--muted-foreground)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '10px' }}>
                            설명
                        </span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="어떤 식사를 했는지 적어주세요"
                            required
                            maxLength={300}
                            className="input-base textarea-base"
                            style={{ width: '100%', padding: '12px', resize: 'none', height: '80px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '14px',
                            background: 'var(--muted)',
                            color: 'var(--foreground)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            flex: 2,
                            padding: '16px',
                            borderRadius: '14px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                    >
                        {isSubmitting ? '수정 중...' : (<><Save size={18} /> 수정 완료</>)}
                    </button>
                </div>
            </form>
        </div>
    );
}
</div>

                <button type="submit" disabled={isSubmitting} className="btn w-full gap-2 text-lg">
                    {isSubmitting ? '수정 중...' : (<><Save size={20} /> 수정 완료</>)}
                </button>
            </form>
        </div>
    );
}
