"use client";

import { useUser } from '@/context/UserContext';
import { Meal, UserRole } from '@/lib/types';
import { Camera, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/Toast';

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

    useEffect(() => {
        if (!userProfile?.role) {
            router.replace('/');
            return;
        }
        if (selectedUsers.length === 0) {
            setSelectedUsers([userProfile.role]);
        }
    }, [userProfile?.role, router, selectedUsers.length]);

    if (!userProfile?.role) return null;

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
            const { addMeal } = await import('@/lib/data');
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

    const ROLES: UserRole[] = ['아빠', '엄마', '딸', '아들'];

    return (
        <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
                식사 작성하기
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '24px' }}>
                오늘 먹은 음식을 기록해보세요
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Photo Section */}
                <div style={{
                    border: '1px solid var(--border)', borderRadius: '16px',
                    overflow: 'hidden', background: 'var(--card)'
                }}>
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>📷 사진</span>
                        {imagePreview && (
                            <button type="button"
                                onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                style={{
                                    fontSize: '0.8rem', color: 'var(--muted-foreground)',
                                    background: 'none', border: 'none', cursor: 'pointer'
                                }}>
                                삭제
                            </button>
                        )}
                    </div>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            aspectRatio: '16/9', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', background: 'var(--muted)',
                            position: 'relative'
                        }}
                    >
                        {imagePreview ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={imagePreview} alt="Preview" style={{
                                width: '100%', height: '100%', objectFit: 'cover'
                            }} />
                        ) : (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                color: 'var(--muted-foreground)', gap: '8px'
                            }}>
                                <Camera size={36} strokeWidth={1.5} />
                                <span style={{ fontSize: '0.85rem' }}>탭하여 사진 추가</span>
                            </div>
                        )}
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange}
                    accept="image/*" style={{ display: 'none' }} />

                {/* Meal Details Section */}
                <div style={{
                    border: '1px solid var(--border)', borderRadius: '16px',
                    overflow: 'hidden', background: 'var(--card)'
                }}>
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>🍽️ 식사 정보</span>
                    </div>

                    {/* Meal Type Row */}
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>식사 종류</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['아침', '점심', '저녁', '간식'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '20px',
                                        fontSize: '0.85rem', fontWeight: type === t ? 600 : 400,
                                        background: type === t ? 'var(--primary)' : 'var(--muted)',
                                        color: type === t ? 'white' : 'var(--muted-foreground)',
                                        border: 'none', cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Participants Row */}
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>함께한 사람</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {ROLES.map((role) => (
                                <button key={role} type="button" onClick={() => toggleUser(role)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '20px',
                                        fontSize: '0.85rem', fontWeight: selectedUsers.includes(role) ? 600 : 400,
                                        background: selectedUsers.includes(role) ? 'var(--primary)' : 'var(--muted)',
                                        color: selectedUsers.includes(role) ? 'white' : 'var(--muted-foreground)',
                                        border: 'none', cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}>
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description Row */}
                    <div style={{ padding: '14px 16px' }}>
                        <span style={{
                            fontSize: '0.9rem', color: 'var(--muted-foreground)',
                            display: 'block', marginBottom: '10px'
                        }}>설명</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="어떤 음식을 드셨나요?"
                            required
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--border)', background: 'var(--muted)',
                                resize: 'none', height: '80px', fontSize: '0.9rem',
                                fontFamily: 'inherit', outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isSubmitting}
                    style={{
                        width: '100%', padding: '16px', borderRadius: '14px',
                        background: 'var(--primary)', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: '1rem',
                        fontWeight: 600, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px',
                        opacity: isSubmitting ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                    }}>
                    {isSubmitting ? '업로드 중...' : (
                        <>
                            <Send size={18} /> 작성하기
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
