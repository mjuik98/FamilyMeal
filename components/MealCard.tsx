import { Meal } from '@/lib/types';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { deleteMeal } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

const userColors: Record<string, string> = {
    '아빠': 'bg-blue-100 text-blue-700',
    '엄마': 'bg-pink-100 text-pink-700',
    '딸': 'bg-purple-100 text-purple-700',
    '아들': 'bg-amber-100 text-amber-700',
};

export default function MealCard({ meal }: { meal: Meal }) {
    const { userProfile } = useUser();
    const router = useRouter();
    const { showToast } = useToast();
    const date = new Date(meal.timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const rawUids = meal.userIds || (meal.userId ? [meal.userId] : []);
    const VALID_ROLES = ['아빠', '엄마', '딸', '아들'];
    // If author is '나' or not a valid role, replace with current user's role
    const uids = rawUids.map((uid, idx) => {
        if (idx === 0 && !VALID_ROLES.includes(uid) && userProfile?.role) {
            return userProfile.role;
        }
        return uid;
    });
    const isOwner = userProfile?.role && uids.length > 0 && (uids[0] === userProfile.role || (rawUids[0] as string) === '나');

    const handleDelete = async () => {
        if (!confirm('정말로 이 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteMeal(meal.id);
            // Trigger a refresh after deletion
            router.refresh();
        } catch (error) {
            console.error('Failed to delete meal', error);
            showToast('삭제에 실패했습니다.', 'error');
        }
    };

    const handleEdit = () => {
        router.push(`/edit/${meal.id}`);
    };

    return (
        <div className="card mb-4 p-4">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1.5 items-start">
                        {(() => {
                            if (uids.length === 0) return null;
                            const ROLE_ORDER: Record<string, number> = { '아빠': 1, '엄마': 2, '딸': 3, '아들': 4 };
                            const author = uids[0];
                            const companions = uids.slice(1).sort((a, b) => (ROLE_ORDER[a] || 5) - (ROLE_ORDER[b] || 5));

                            return (
                                <>
                                    <div className="flex items-center">
                                        <span className="text-xs text-muted-foreground mr-1 font-medium">작성:</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${userColors[author] || 'bg-gray-100'}`}>
                                            {author}
                                        </span>
                                    </div>
                                    {companions.length > 0 && (
                                        <div className="flex items-center flex-wrap gap-1 mt-1">
                                            <span className="text-xs text-muted-foreground mr-1 font-medium">함께:</span>
                                            {companions.map((uid, idx) => (
                                                <span key={uid}>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${userColors[uid!] || 'bg-gray-100'}`}>
                                                        {uid}
                                                    </span>
                                                    {idx < companions.length - 1 && <span className="text-muted-foreground font-bold ml-1 mr-0.5">,</span>}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                        {meal.type}
                    </span>
                    <span className="text-xs text-muted font-medium flex items-center gap-1">
                        <Clock size={12} /> {timeString}
                    </span>
                    {isOwner && (
                        <div className="flex gap-2">
                            <button onClick={handleEdit} className="text-muted-foreground hover:text-primary transition-colors p-1" title="수정">
                                <Pencil size={14} />
                            </button>
                            <button onClick={handleDelete} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="삭제">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-lg mb-2">{meal.description}</h3>

            {meal.imageUrl && (
                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={meal.imageUrl}
                        alt={meal.description}
                        className="object-cover w-full h-full"
                    />
                </div>
            )}
        </div>
    );
}
