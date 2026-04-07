"use client";

import SurfaceSection from "@/components/SurfaceSection";
import type { NotificationPreferences } from "@/lib/types";

const NOTIFICATION_ROWS: Array<{
  copy: string;
  key: keyof NotificationPreferences;
  label: string;
  testId: string;
}> = [
  {
    key: "browserEnabled",
    testId: "profile-notification-toggle-browserEnabled",
    label: "브라우저 알림",
    copy: "브라우저 권한이 있을 때만 알림을 보여줍니다.",
  },
  {
    key: "commentAlerts",
    testId: "profile-notification-toggle-commentAlerts",
    label: "댓글 알림",
    copy: "내 식사에 새 댓글이 달리면 알려줍니다.",
  },
  {
    key: "reactionAlerts",
    testId: "profile-notification-toggle-reactionAlerts",
    label: "반응 알림",
    copy: "내 식사나 댓글에 새 반응이 생기면 알려줍니다.",
  },
  {
    key: "replyAlerts",
    testId: "profile-notification-toggle-replyAlerts",
    label: "답글 알림",
    copy: "내 댓글에 답글이 달리면 알려줍니다.",
  },
];

export function ProfileNotificationSection({
  notificationPreferences,
  savingSettings,
  onTogglePreference,
}: {
  notificationPreferences: NotificationPreferences;
  savingSettings: boolean;
  onTogglePreference: (key: keyof NotificationPreferences) => void;
}) {
  return (
    <SurfaceSection title="알림 설정">
      {NOTIFICATION_ROWS.map(({ copy, key, label, testId }) => {
        const active = notificationPreferences[key];

        return (
          <div key={key} className="surface-row-spread">
            <div className="page-stack-gap-sm">
              <span style={{ fontWeight: 700 }}>{label}</span>
              <span className="surface-note">{copy}</span>
            </div>
            <button
              type="button"
              onClick={() => onTogglePreference(key)}
              disabled={savingSettings}
              className={`chip-button${active ? " chip-button-active" : ""}`}
              data-testid={testId}
              data-active={active ? "true" : "false"}
            >
              {active ? "켜짐" : "꺼짐"}
            </button>
          </div>
        );
      })}
    </SurfaceSection>
  );
}
