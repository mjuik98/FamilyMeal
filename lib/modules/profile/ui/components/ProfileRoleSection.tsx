"use client";

import SurfaceSection from "@/components/SurfaceSection";
import { USER_ROLES } from "@/lib/domain/user-role";
import type { UserRole } from "@/lib/types";

const roleEmoji: Record<UserRole, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export function ProfileRoleSection({
  selectedRole,
  roleLocked,
  savingRole,
  onSelectRole,
}: {
  selectedRole: UserRole | null;
  roleLocked: boolean;
  savingRole: boolean;
  onSelectRole: (role: UserRole) => void;
}) {
  return (
    <SurfaceSection title="역할 선택" bodyClassName="profile-role-list">
      {USER_ROLES.map((role) => {
        const isSelected = selectedRole === role;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onSelectRole(role)}
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
  );
}
