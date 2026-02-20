import { Meal } from '@/lib/types';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { deleteMeal } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import { useState } from 'react';

const roleEmoji: Record<string, string> = {
    '아빠': '👨', '엄마': '👩', '딸': '👧', '아들': '👦'
};

const mealTypeEmoji: Record<string, string> = {
    '아침': '🌅', '점심': '☀️', '저녁': '🌙', '간식': '🍪'
};

export default function MealCard({ meal }: { meal: Meal }) {
    const { userProfile } = useUser();
    const router = useRouter();
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const [imgLoaded, setImgLoaded] = useState(false);
    const date = new Date(meal.timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const rawUids = meal.userIds || (meal.userId ? [meal.userId] : []);
    const VALID_ROLES = ['아빠', '엄마', '딸', '아들'];
    const uids = rawUids.map((uid, idx) => {
        if (idx === 0 && !VALID_ROLES.includes(uid) && userProfile?.role) {
            return userProfile.role;
        }
        return uid;
    });
    const isOwner = userProfile?.role && uids.length > 0 && (uids[0] === userProfile.role || (rawUids[0] as string) === '나');

    const handleDelete = async () => {
        const confirmed = await showConfirm({
            title: '기록 삭제',
            message: '이 식사 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.',
            confirmText: '삭제',
            cancelText: '취소',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await deleteMeal(meal.id);
            showToast('삭제되었습니다.', 'success');
            router.refresh();
        } catch (error) {
            console.error('Failed to delete meal', error);
            showToast('삭제에 실패했습니다.', 'error');
        }
    };

    const handleEdit = () => {
        router.push(`/edit/${meal.id}`);
    };

    const author = uids[0];
    const companions = uids.slice(1);

    return (
        <div style={{
            border: '1px solid var(--border)', borderRadius: '16px',
            overflow: 'hidden', background: 'var(--card)'
        }}>
            {/* Image */}
            {meal.imageUrl && (
                <div style={{
                    position: 'relative', width: '100%', aspectRatio: '16/9',
                    background: 'var(--muted)', overflow: 'hidden'
                }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={meal.imageUrl}
                        alt={meal.description}
                        loading="lazy"
                        onLoad={() => setImgLoaded(true)}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease'
                        }}
                    />
                </div>
            )}

            {/* Content */}
            <div style={{ padding: '14px 16px' }}>
                {/* Header row: meal type + time + actions */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            padding: '4px 10px', borderRadius: '8px',
                            background: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600
                        }}>
                            {mealTypeEmoji[meal.type] || '🍽️'} {meal.type}
                        </span>
                        <span style={{
                            fontSize: '0.8rem', color: 'var(--muted-foreground)',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <Clock size={12} /> {timeString}
                        </span>
                    </div>
                    {isOwner && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={handleEdit} title="수정"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--muted-foreground)', padding: '6px',
                                    borderRadius: '8px', transition: 'background 0.15s'
                                }}>
                                <Pencil size={15} />
                            </button>
                            <button onClick={handleDelete} title="삭제"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--muted-foreground)', padding: '6px',
                                    borderRadius: '8px', transition: 'background 0.15s'
                                }}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Description */}
                <p style={{
                    fontSize: '1rem', fontWeight: 600, margin: '0 0 10px',
                    lineHeight: 1.4
                }}>
                    {meal.description}
                </p>

                {/* Participants */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {author && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px',
                            background: 'var(--primary)', color: 'white',
                            fontSize: '0.78rem', fontWeight: 600
                        }}>
                            {roleEmoji[author]} {author}
                        </span>
                    )}
                    {companions.map((uid) => (
                        <span key={uid} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px',
                            background: 'var(--muted)', fontSize: '0.78rem', fontWeight: 500
                        }}>
                            {roleEmoji[uid!] || '👤'} {uid}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
