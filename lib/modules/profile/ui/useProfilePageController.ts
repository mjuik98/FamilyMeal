"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { USER_ROLES } from "@/lib/domain/user-role";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/modules/profile/domain/notification-preferences";
import { useUser } from "@/lib/modules/profile/ui/UserSessionProvider";
import { useToast } from "@/lib/platform/feedback/ToastProvider";

export const useProfilePageController = () => {
  const { userProfile, selectRole, user, loading, signOut, updateNotificationPreferences } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  const [savingRole, setSavingRole] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user && !userProfile) {
      router.push("/");
    }
  }, [loading, router, user, userProfile]);

  const roleLocked = Boolean(userProfile?.role);
  const notificationPreferences =
    userProfile?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const handleSelectRole = async (role: (typeof USER_ROLES)[number]) => {
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
      showToast("알림 설정이 저장되었습니다.", "success");
    } catch {
      showToast("알림 설정 저장에 실패했습니다.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  return {
    canRender: Boolean(user),
    loading,
    notificationPreferences,
    pageSubtitle: roleLocked
      ? "역할 변경은 관리자에게 요청해 주세요."
      : "가족 구성원을 선택해 주세요.",
    roleLocked,
    savingRole,
    savingSettings,
    selectedRole: userProfile?.role ?? null,
    signOut,
    userEmail: user?.email ?? null,
    handleSelectRole,
    handleTogglePreference,
  };
};
