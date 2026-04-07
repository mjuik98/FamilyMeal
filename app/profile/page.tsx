"use client";

import { LogOut } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ProfileAccountSection } from "@/lib/modules/profile/ui/components/ProfileAccountSection";
import { ProfileNotificationSection } from "@/lib/modules/profile/ui/components/ProfileNotificationSection";
import { ProfileRoleSection } from "@/lib/modules/profile/ui/components/ProfileRoleSection";
import { useProfilePageController } from "@/lib/modules/profile/ui/useProfilePageController";

export default function ProfilePage() {
  const controller = useProfilePageController();

  if (controller.loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!controller.canRender) return null;

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader
          title="프로필"
          subtitle={controller.pageSubtitle}
        />

        <ProfileAccountSection email={controller.userEmail} />

        <ProfileRoleSection
          selectedRole={controller.selectedRole}
          roleLocked={controller.roleLocked}
          savingRole={controller.savingRole}
          onSelectRole={(role) => void controller.handleSelectRole(role)}
        />

        <ProfileNotificationSection
          notificationPreferences={controller.notificationPreferences}
          savingSettings={controller.savingSettings}
          onTogglePreference={(key) => void controller.handleTogglePreference(key)}
        />

        <button type="button" onClick={() => void controller.signOut()} className="secondary-button">
          <LogOut size={18} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
