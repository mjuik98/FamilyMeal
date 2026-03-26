import type { ActivityFeedItem } from "@/lib/types";

const feedIcon: Record<ActivityFeedItem["kind"], string> = {
  "meal-comment": "💬",
  "comment-reply": "↪️",
  "meal-reaction": "✨",
  "comment-reaction": "👏",
};

export default function ActivityFeed({
  items,
  unreadCount,
  onMarkAllRead,
}: {
  items: ActivityFeedItem[];
  unreadCount: number;
  onMarkAllRead?: () => void;
}) {
  return (
    <section className="activity-feed surface-card" data-testid="activity-feed">
      <div className="activity-feed-header">
        <div>
          <p className="activity-feed-title">최근 상호작용</p>
          <p className="activity-feed-copy">내 기록과 댓글에 남겨진 움직임을 시간순으로 모았습니다.</p>
        </div>
        <div className="activity-feed-actions">
          <span className="activity-feed-count">{unreadCount}</span>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={!onMarkAllRead || unreadCount === 0}
            className="link-button"
            data-testid="activity-mark-all-read"
          >
            모두 읽음
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="activity-feed-empty">
          <p className="activity-feed-empty-title">새로운 알림이 없습니다</p>
          <p className="activity-feed-empty-copy">가족 반응과 답글이 생기면 여기에 바로 보입니다.</p>
        </div>
      ) : (
        <div className="activity-feed-list">
          {items.map((item) => (
            <article
              key={item.id}
              className={`activity-feed-item${item.readAt ? "" : " activity-feed-item-unread"}`}
              data-testid="activity-feed-item"
            >
              <div className="activity-feed-icon" aria-hidden="true">
                {feedIcon[item.kind]}
              </div>
              <div className="activity-feed-body">
                <p className="activity-feed-line">
                  <span className="activity-feed-actor">{item.actorLabel}</span>
                  <span>{item.actionLabel}</span>
                </p>
                <p className="activity-feed-preview">{item.preview}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
