"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useUser } from "@/context/UserContext";
import { users } from "@/lib/data";

const roleEmoji: Record<string, string> = {
  아빠: "👨",
  엄마: "👩",
  딸: "👧",
  아들: "👦",
};

export default function ProfilePage() {
  const { userProfile, selectRole, user, signOut } = useUser();
  const router = useRouter();
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (!user && !userProfile) {
      router.push("/");
    }
  }, [router, user, userProfile]);

  if (!user) return null;

  const roleLocked = Boolean(userProfile?.role);

  const handleSelectRole = async (role: (typeof users)[number]) => {
    if (roleLocked || savingRole) return;
    setSavingRole(true);
    try {
      await selectRole(role);
    } finally {
      setSavingRole(false);
    }
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

        <button type="button" onClick={() => void signOut()} className="secondary-button">
          <LogOut size={18} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
