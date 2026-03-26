type SummaryItem = {
  key: string;
  label: string;
  value: number;
};

export default function ActivitySummary({
  items,
  alertCount,
}: {
  items: SummaryItem[];
  alertCount: number;
}) {
  return (
    <div className="page-stack-gap-sm">
      <section className="activity-summary-grid">
        {items.map((item) => (
          <div key={item.key} className="activity-summary-card surface-card" data-testid={`activity-summary-card-${item.key}`}>
            <p className="activity-summary-label">{item.label}</p>
            <p className="activity-summary-value">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="activity-alert surface-card">
        <div>
          <p className="activity-alert-title">오늘의 상호작용</p>
          <p className="activity-alert-copy">내 기록에 남겨진 가족 반응과 댓글을 빠르게 확인하세요.</p>
        </div>
        <span className="activity-alert-badge" data-testid="activity-alert-badge">
          {alertCount}
        </span>
      </section>
    </div>
  );
}
