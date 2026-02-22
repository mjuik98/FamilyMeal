"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

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
  }, [user, userProfile, router]);

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
    <div style={{ padding: "20px 16px", paddingBottom: "100px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "4px" }}>
        프로필
      </h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "24px" }}>
        {roleLocked ? "역할 변경은 관리자에게 요청해 주세요." : "가족 구성원을 선택해 주세요."}
      </p>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--card)",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>👤 계정 정보</span>
        </div>
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>이메일</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{user.email || "—"}</span>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--card)",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>👨‍👩‍👧‍👦 역할 선택</span>
        </div>

        {users.map((role, idx) => {
          const isSelected = userProfile?.role === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => void handleSelectRole(role)}
              disabled={roleLocked || savingRole}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                gap: "14px",
                borderBottom: idx < users.length - 1 ? "1px solid var(--border)" : "none",
                background: isSelected ? "rgba(107, 142, 35, 0.08)" : "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: idx < users.length - 1 ? "1px" : "0",
                borderBottomColor: "var(--border)",
                cursor: roleLocked || savingRole ? "not-allowed" : "pointer",
                transition: "background 0.15s ease",
                textAlign: "left",
                opacity: roleLocked && !isSelected ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  background: isSelected ? "var(--primary)" : "var(--muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {isSelected ? (
                  <span style={{ color: "white", fontSize: "1rem" }}>✓</span>
                ) : (
                  roleEmoji[role]
                )}
              </div>
              <span
                style={{
                  flex: 1,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "1rem",
                  color: isSelected ? "var(--primary)" : "var(--foreground)",
                }}
              >
                {role}
              </span>
              {isSelected && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    background: "var(--primary)",
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  현재
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void signOut()}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "14px",
          background: "var(--card)",
          color: "#DC2626",
          border: "1px solid var(--border)",
          cursor: "pointer",
          fontSize: "0.95rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <LogOut size={18} /> 로그아웃
      </button>
    </div>
  );
}
