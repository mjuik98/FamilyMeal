"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/activity";
import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useUser } from "@/context/UserContext";
import { users } from "@/lib/client/profile";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function ProfilePage() {
  const { userProfile, selectRole, user, loading, signOut, updateNotificationPreferences } = useUser();
  const router = useRouter();
  const [savingRole, setSavingRole] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user && !userProfile) {
      router.push("/");
    }
  }, [loading, router, user, userProfile]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const roleLocked = Boolean(userProfile?.role);
  const notificationPreferences =
    userProfile?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const handleSelectRole = async (role: (typeof users)[number]) => {
    if (roleLocked || savingRole) return;
    setSavingRole(true);
    try {
      await selectRole(role);
    } finally {
      setSavingRole(false);
    }
  };

  const handleTogglePreference = async (
    key: keyof typeof notificationPreferences
  ) => {
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      await updateNotificationPreferences({
        ...notificationPreferences,
        [key]: !notificationPreferences[key],
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const renderNotificationRow = (
    key: keyof typeof notificationPreferences,
    testId: string,
    label: string,
    copy: string
  ) => {
    const active = notificationPreferences[key];

    return (
      <div className="surface-row-spread">
        <div className="page-stack-gap-sm">
          <span style={{ fontWeight: 700 }}>{label}</span>
          <span className="surface-note">{copy}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleTogglePreference(key)}
          disabled={savingSettings}
          className={`chip-button${active ? " chip-button-active" : ""}`}
          data-testid={testId}
          data-active={active ? "true" : "false"}
        >
          {active ? "켜짐" : "꺼짐"}
        </button>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader
          title="프로필"
          subtitle={roleLocked ? "역할 변경은 관리자에게 요청해 주세요." : "가족 구성원을 선택해 주세요."}
        />

        <SurfaceSection title="계정 정보">
            <div className="surface-row-spread">
              <span className="surface-note">이메일</span>
              <span style={{ fontWeight: 600 }}>{user.email || "—"}</span>
            </div>
        </SurfaceSection>

        <SurfaceSection title="역할 선택" bodyClassName="profile-role-list">
            {users.map((role) => {
              const isSelected = userProfile?.role === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => void handleSelectRole(role)}
                  disabled={roleLocked || savingRole}
                  className={`profile-role-button${isSelected ? " profile-role-button-active" : ""}`}
                  style={{ opacity: roleLocked && !isSelected ? 0.6 : 1 }}
                >
                  <div className="profile-role-avatar">
                    {isSelected ? <span style={{ fontSize: "1rem" }}>✓</span> : roleEmoji[role]}
                  </div>
                  <span className="profile-role-name">{role}</span>
                  {isSelected && <span className="profile-role-badge">현재</span>}
                </button>
              );
            })}
        </SurfaceSection>

        <SurfaceSection title="알림 설정">
          {renderNotificationRow(
            "browserEnabled",
            "profile-notification-toggle-browserEnabled",
            "브라우저 알림",
            "브라우저 권한이 있을 때만 알림을 보여줍니다."
          )}
          {renderNotificationRow(
            "commentAlerts",
            "profile-notification-toggle-commentAlerts",
            "댓글 알림",
            "내 식사에 새 댓글이 달리면 알려줍니다."
          )}
          {renderNotificationRow(
            "reactionAlerts",
            "profile-notification-toggle-reactionAlerts",
            "반응 알림",
            "내 식사나 댓글에 새 반응이 생기면 알려줍니다."
          )}
          {renderNotificationRow(
            "replyAlerts",
            "profile-notification-toggle-replyAlerts",
            "답글 알림",
            "내 댓글에 답글이 달리면 알려줍니다."
          )}
        </SurfaceSection>

        <button type="button" onClick={() => void signOut()} className="secondary-button">
          <LogOut size={18} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
