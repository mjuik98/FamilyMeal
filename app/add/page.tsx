"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Send } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useUser } from "@/context/UserContext";
import { Meal, UserRole } from "@/lib/types";
import { useToast } from "@/components/Toast";

const ROLES: UserRole[] = ["아빠", "엄마", "딸", "아들"];

export default function AddMealPage() {
  const { userProfile } = useUser();
  const router = useRouter();
  const { showToast } = useToast();

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userProfile?.role) {
      router.replace("/");
      return;
    }

    if (selectedUsers.length === 0) {
      setSelectedUsers([userProfile.role]);
    }
  }, [router, selectedUsers.length, userProfile?.role]);

  if (!userProfile?.role) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleUser = (role: UserRole) => {
    setSelectedUsers((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== role);
      }
      return [...prev, role];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedDescription = description.trim();
    if (!normalizedDescription) {
      showToast("설명을 입력해 주세요.", "error");
      return;
    }
    if (normalizedDescription.length > 300) {
      showToast("설명은 300자 이하로 입력해 주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const { addMeal } = await import("@/lib/data");
      const { uploadImage } = await import("@/lib/uploadImage");

      let imageUrl: string | undefined;
      if (imagePreview) {
        imageUrl = await uploadImage(imagePreview);
      }

      await addMeal({
        ownerUid: userProfile.uid,
        userIds: selectedUsers,
        description: normalizedDescription,
        type,
        imageUrl,
        timestamp: Date.now(),
        commentCount: 0,
        reactions: {},
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to add meal", error);
      showToast("식사 기록 등록에 실패했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader title="식사 작성하기" subtitle="오늘 먹은 식사를 사진과 함께 정리해보세요." />

        <form onSubmit={handleSubmit} className="form-stack">
          <SurfaceSection
            title="사진"
            actions={
              imagePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="link-button"
                >
                  삭제
                </button>
              ) : undefined
            }
            bodyClassName=""
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="media-picker"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="media-preview" />
              ) : (
                <div className="media-placeholder">
                  <Camera size={36} strokeWidth={1.5} />
                  <span style={{ fontSize: "0.85rem" }}>눌러서 사진 추가</span>
                </div>
              )}
            </button>
          </SurfaceSection>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: "none" }}
          />

          <SurfaceSection title="식사 정보" bodyClassName="surface-body form-stack">
              <div>
                <label className="form-label">식사 종류</label>
                <div className="chip-group">
                  {(["아침", "점심", "저녁", "간식"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`chip-button${type === value ? " chip-button-active" : ""}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">함께 먹은 사람</label>
                <div className="chip-group">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleUser(role)}
                      className={`chip-button${selectedUsers.includes(role) ? " chip-button-active" : ""}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="어떤 식사를 했는지 적어주세요"
                  required
                  maxLength={300}
                  className="input-base textarea-base"
                  style={{
                    width: "100%",
                    minHeight: "116px",
                    padding: "14px 14px 16px",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </div>
          </SurfaceSection>

          <button type="submit" disabled={isSubmitting} className="primary-button">
            {isSubmitting ? "등록 중..." : <><Send size={18} /> 작성하기</>}
          </button>
        </form>
      </div>
    </div>
  );
}
