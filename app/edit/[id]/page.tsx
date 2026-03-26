"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useUser } from "@/context/UserContext";
import { toMealUpdateErrorMessage } from "@/lib/meal-errors";
import { Meal, UserRole } from "@/lib/types";
import { useToast } from "@/components/Toast";

const ROLES: UserRole[] = ["아빠", "엄마", "딸", "아들"];

export default function EditMealPage() {
  const { userProfile } = useUser();
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  const { showToast } = useToast();

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsOwnerAdoption, setNeedsOwnerAdoption] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userProfile?.role) {
      router.replace("/");
      return;
    }

    const loadMeal = async () => {
      try {
        const { getMealById } = await import("@/lib/data");
        const meal = await getMealById(mealId);
        if (!meal) {
          showToast("해당 기록을 찾을 수 없습니다.", "error");
          router.push("/");
          return;
        }

        if (meal.ownerUid && meal.ownerUid !== userProfile.uid) {
          showToast("작성자만 수정할 수 있습니다.", "error");
          router.push("/");
          return;
        }

        setDescription(meal.description);
        setType(meal.type);
        setImagePreview(meal.imageUrl || null);
        setSelectedUsers(meal.userIds?.length ? meal.userIds : userProfile.role ? [userProfile.role] : []);
        setNeedsOwnerAdoption(!meal.ownerUid);
      } catch (error) {
        console.error("Failed to load meal", error);
        showToast("기록을 불러오지 못했습니다.", "error");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    void loadMeal();
  }, [mealId, router, showToast, userProfile]);

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
      const { updateMeal } = await import("@/lib/data");
      const { uploadImage } = await import("@/lib/uploadImage");

      let imageUrl: string | null | undefined = imagePreview || undefined;
      if (imagePreview && imagePreview.startsWith("data:")) {
        try {
          imageUrl = await uploadImage(imagePreview);
        } catch (error) {
          console.error("Failed to upload updated meal image", error);
          showToast(toMealUpdateErrorMessage(error, "upload"), "error");
          return;
        }
      } else if (!imagePreview) {
        imageUrl = null;
      }

      try {
        await updateMeal(mealId, {
          ...(needsOwnerAdoption ? { ownerUid: userProfile.uid } : {}),
          userIds: selectedUsers,
          description: normalizedDescription,
          type,
          imageUrl,
        });
      } catch (error) {
        console.error("Failed to save updated meal", error);
        showToast(toMealUpdateErrorMessage(error, "save"), "error");
        return;
      }

      showToast("수정되었습니다.", "success");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to update meal", error);
      showToast(toMealUpdateErrorMessage(error, "save"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader
          title="기록 수정하기"
          subtitle="기록된 내용을 같은 화면 패턴 안에서 깔끔하게 수정합니다."
        />

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

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="secondary-button">
              취소
            </button>
            <button type="submit" disabled={isSubmitting} className="primary-button">
              {isSubmitting ? "수정 중..." : <><Save size={18} /> 수정 완료</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
