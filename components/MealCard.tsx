import { Meal, MealComment } from '@/lib/types';
import { Check, Clock, MessageSquare, Pencil, Send, Trash2, X } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { addMealComment, deleteMeal, deleteMealComment, subscribeMealComments, updateMealComment } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import { useEffect, useState } from 'react';

const roleEmoji: Record<string, string> = {
  '\uC544\uBE60': '\uD83D\uDC68',
  '\uC5C4\uB9C8': '\uD83D\uDC69',
  '\uB538': '\uD83D\uDC67',
  '\uC544\uB4E4': '\uD83D\uDC66',
};

export default function MealCard({ meal }: { meal: Meal }) {
  const { userProfile } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const [imgLoaded, setImgLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [comments, setComments] = useState<MealComment[]>(meal.comments ?? []);

  useEffect(() => {
    setComments(meal.comments ?? []);
  }, [meal.id, meal.comments]);

  useEffect(() => {
    const unsubscribe = subscribeMealComments(
      meal.id,
      (nextComments) => {
        if (nextComments.length === 0 && (meal.comments?.length ?? 0) > 0) {
          setComments(meal.comments ?? []);
          return;
        }
        setComments(nextComments);
      },
      () => {
        // Keep last known comments on subscription failure.
      }
    );

    return () => unsubscribe();
  }, [meal.id, meal.comments]);

  const date = new Date(meal.timestamp);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const uids = meal.userIds || (meal.userId ? [meal.userId] : []);
  const isOwner = Boolean(userProfile?.role && uids.length > 0 && uids[0] === userProfile.role);

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: '\uC2DD\uC0AC \uAE30\uB85D \uC0AD\uC81C',
      message: '\uC774 \uC2DD\uC0AC \uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
      confirmText: '\uC0AD\uC81C',
      cancelText: '\uCDE8\uC18C',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await deleteMeal(meal.id);
      showToast('\uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete meal', error);
      showToast('\uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
    }
  };

  const handleEdit = () => {
    router.push(`/edit/${meal.id}`);
  };

  const handleAddComment = async () => {
    if (!userProfile?.role || !userProfile.uid) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const now = Date.now();
    const optimisticComment: MealComment = {
      id: optimisticId,
      author: userProfile.role,
      authorUid: userProfile.uid,
      text: trimmed,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
    };

    setIsSubmittingComment(true);
    setCommentText('');
    setComments((prev) => [...prev, optimisticComment]);

    try {
      const created = await addMealComment(meal.id, userProfile.role, userProfile.uid, trimmed);
      setComments((prev) => prev.map((comment) => (comment.id === optimisticId ? created : comment)));
      showToast('\uB313\uAE00\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
    } catch (error) {
      console.error('Failed to add comment', error);
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
      setCommentText(trimmed);
      showToast('\uB313\uAE00 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startEditingComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(currentText);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveComment = async (commentId: string) => {
    if (!userProfile?.role || !userProfile.uid) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const now = Date.now();
    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, text: trimmed, updatedAt: now, timestamp: now }
          : comment
      );
    });

    setCommentActionId(commentId);
    try {
      const updated = await updateMealComment(meal.id, commentId, userProfile.role, userProfile.uid, trimmed);
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)));
      cancelEditingComment();
      showToast('\uB313\uAE00\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
    } catch (error) {
      console.error('Failed to update comment', error);
      setComments(previous);
      showToast('\uB313\uAE00 \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
    } finally {
      setCommentActionId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!userProfile?.role || !userProfile.uid) return;

    const confirmed = await showConfirm({
      title: '\uB313\uAE00 \uC0AD\uC81C',
      message: '\uC774 \uB313\uAE00\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
      confirmText: '\uC0AD\uC81C',
      cancelText: '\uCDE8\uC18C',
      danger: true,
    });
    if (!confirmed) return;

    let previous: MealComment[] = [];
    setComments((prev) => {
      previous = prev;
      return prev.filter((comment) => comment.id !== commentId);
    });

    setCommentActionId(commentId);
    try {
      await deleteMealComment(meal.id, commentId, userProfile.role, userProfile.uid);
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      showToast('\uB313\uAE00\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
    } catch (error) {
      console.error('Failed to delete comment', error);
      setComments(previous);
      showToast('\uB313\uAE00 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
    } finally {
      setCommentActionId(null);
    }
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });

    if (abs < 60) return rtf.format(Math.trunc(diffSeconds), 'second');
    if (abs < 3600) return rtf.format(Math.trunc(diffSeconds / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.trunc(diffSeconds / 3600), 'hour');
    if (abs < 604800) return rtf.format(Math.trunc(diffSeconds / 86400), 'day');
    if (abs < 2592000) return rtf.format(Math.trunc(diffSeconds / 604800), 'week');
    if (abs < 31536000) return rtf.format(Math.trunc(diffSeconds / 2592000), 'month');
    return rtf.format(Math.trunc(diffSeconds / 31536000), 'year');
  };

  const author = uids[0];
  const companions = uids.slice(1);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--card)' }}>
      {meal.imageUrl && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--muted)', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.imageUrl}
            alt={meal.description}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              {meal.type}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {timeString}
            </span>
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handleEdit}
                title="edit"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px', borderRadius: '8px' }}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                title="delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px', borderRadius: '8px' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 10px', lineHeight: 1.4 }}>
          {meal.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {author && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'var(--primary)', color: 'white', fontSize: '0.78rem', fontWeight: 600 }}>
              {roleEmoji[author] || '\uD83D\uDE42'} {author}
            </span>
          )}
          {companions.map((uid) => (
            <span key={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'var(--muted)', fontSize: '0.78rem', fontWeight: 500 }}>
              {roleEmoji[uid] || '\uD83D\uDE42'} {uid}
            </span>
          ))}
        </div>

        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
            <MessageSquare size={14} /> {'\uB313\uAE00'} {comments.length}
          </div>

          {comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comments.map((comment) => {
                const timeBase = comment.updatedAt || comment.createdAt || comment.timestamp || Date.now();
                const canManage = Boolean(userProfile?.role && userProfile?.uid && comment.author === userProfile.role && comment.authorUid === userProfile.uid);
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} style={{ borderRadius: '10px', background: 'var(--muted)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                          {roleEmoji[comment.author] || '\uD83D\uDE42'} {comment.author}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                          {formatRelativeTime(timeBase)}
                        </span>
                      </div>

                      {canManage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => startEditingComment(comment.id, comment.text)}
                            disabled={commentActionId === comment.id}
                            style={{ border: 'none', background: 'transparent', padding: '4px', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteComment(comment.id)}
                            disabled={commentActionId === comment.id}
                            style={{ border: 'none', background: 'transparent', padding: '4px', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              if (commentActionId !== comment.id) {
                                void handleSaveComment(comment.id);
                              }
                            }
                          }}
                          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '999px', padding: '6px 10px', fontSize: '0.8rem', background: 'var(--background)', outline: 'none' }}
                        />

                        <button
                          type="button"
                          onClick={() => void handleSaveComment(comment.id)}
                          disabled={commentActionId === comment.id || !editingText.trim()}
                          style={{ border: 'none', background: 'var(--primary)', color: 'white', width: '28px', height: '28px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: commentActionId === comment.id || !editingText.trim() ? 0.5 : 1 }}
                        >
                          <Check size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditingComment}
                          disabled={commentActionId === comment.id}
                          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--muted-foreground)', width: '28px', height: '28px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.35 }}>
                        {comment.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!isSubmittingComment) {
                    void handleAddComment();
                  }
                }
              }}
              placeholder="Add a comment"
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '999px', padding: '8px 12px', fontSize: '0.84rem', background: 'var(--background)', outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => void handleAddComment()}
              disabled={isSubmittingComment || !commentText.trim() || !userProfile?.role}
              style={{ border: 'none', borderRadius: '999px', width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', cursor: 'pointer', opacity: isSubmittingComment || !commentText.trim() ? 0.5 : 1 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
