"use client";

import SurfaceSection from "@/components/SurfaceSection";

export function ProfileAccountSection({ email }: { email: string | null }) {
  return (
    <SurfaceSection title="계정 정보">
      <div className="surface-row-spread">
        <span className="surface-note">이메일</span>
        <span style={{ fontWeight: 600 }}>{email || "—"}</span>
      </div>
    </SurfaceSection>
  );
}
