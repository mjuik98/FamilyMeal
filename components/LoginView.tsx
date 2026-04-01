"use client";

import Image from "next/image";

import { useUser } from "@/context/UserContext";
import { UserRole } from "@/lib/types";

const ROLES: { role: UserRole; emoji: string; label: string; sublabel: string; roleClass: string }[] = [
  { role: "아빠", emoji: "👨", label: "아빠", sublabel: "Dad", roleClass: "role-dad" },
  { role: "엄마", emoji: "👩", label: "엄마", sublabel: "Mom", roleClass: "role-mom" },
  { role: "딸", emoji: "👧", label: "딸", sublabel: "Daughter", roleClass: "role-daughter" },
  { role: "아들", emoji: "👦", label: "아들", sublabel: "Son", roleClass: "role-son" },
];

export default function LoginView() {
  const { user, userProfile, signInWithGoogle, selectRole, loading, authError } = useUser();

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="page-stack-gap-sm">
          <div className="spinner" />
          <p className="text-muted">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <section className="login-screen" aria-label="로그인 화면">
        <div className="login-panel">
          <div className="login-brand">
            <div className="login-brand-mark">
              <Image
                src="/images/family_meal_logo.png"
                alt="가족 식사 로고"
                width={48}
                height={48}
                priority
                sizes="48px"
                className="login-brand-image"
              />
            </div>
            <h1 className="login-brand-title">가족식사</h1>
            <p className="login-brand-tagline">함께 먹는 맛있는 기록</p>
          </div>

          <div className="login-divider" />

          <div className="login-copy">
            <h2 className="login-title">계속하려면 로그인하세요</h2>
            <p className="login-description">
              Google 계정으로 안전하게
              <br />
              가족 식사 기록을 시작합니다
            </p>
          </div>

          {authError && (
            <div className="login-error" role="alert">{authError}</div>
          )}

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="login-google-button"
          >
            <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google로 계속하기</span>
          </button>

          <div className="login-security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>보안 로그인</span>
          </div>
        </div>
      </section>
    );
  }

  if (!userProfile?.role) {
    return (
      <section className="role-selection-screen" aria-label="역할 선택 화면">
        <div className="role-selection-panel">
          <div className="role-selection-header">
            <p className="role-selection-eyebrow">반가워요</p>
            <h2 className="role-selection-title">가족 중 누구인가요?</h2>
            <p className="role-selection-description">한 번만 선택하면 됩니다</p>
          </div>

          {authError && (
            <div className="login-error" role="alert">{authError}</div>
          )}

          <div className="role-selection-list">
            {ROLES.map(({ role, emoji, label, sublabel, roleClass }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  void selectRole(role).catch(() => {
                    // Error message is surfaced from UserContext.
                  });
                }}
                className={`role-selection-card ${roleClass}`}
              >
                <span className="role-selection-icon" aria-hidden="true">{emoji}</span>
                <span className="role-selection-copy">
                  <span className="role-selection-label">{label}</span>
                  <span className="role-selection-sublabel">{sublabel}</span>
                </span>
                <span className="role-selection-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
