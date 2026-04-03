"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import { getMealById, updateMeal } from "@/lib/client/meals";
import { USER_ROLES, VALID_MEAL_TYPES } from "@/lib/domain/meal-policy";
import { toMealUpdateErrorMessage } from "@/lib/meal-errors";
import { isLocalMealImagePreview, readMealImagePreview, toggleMealParticipant } from "@/lib/meal-form";
import { Meal, UserRole } from "@/lib/types";
import { uploadImage } from "@/lib/uploadImage";

export default function EditMealPage() {
  const { userProfile } = useUser();
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  const { showToast } = useToast();
  const currentUid = userProfile?.uid;
  const currentRole = userProfile?.role;

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requiresLegacyMigration, setRequiresLegacyMigration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadRequestSequenceRef = useRef(0);
  const imagePreviewRequestSequenceRef = useRef(0);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (!currentRole) {
      router.replace("/");
      return;
    }

    let active = true;
    const requestId = ++loadRequestSequenceRef.current;
    setLoading(true);

    const loadMeal = async () => {
      try {
        const meal = await getMealById(mealId);
        if (!active || requestId !== loadRequestSequenceRef.current) {
          return;
        }
        if (!meal) {
          showToastRef.current("해당 기록을 찾을 수 없습니다.", "error");
          router.push("/");
          return;
        }

        if (meal.ownerUid && meal.ownerUid !== currentUid) {
          showToastRef.current("작성자만 수정할 수 있습니다.", "error");
          router.push("/");
          return;
        }

        setDescription(meal.description);
        setType(meal.type);
        setImagePreview(meal.imageUrl || null);
        setSelectedUsers(meal.userIds?.length ? meal.userIds : currentRole ? [currentRole] : []);
        setRequiresLegacyMigration(!meal.ownerUid);
      } catch (error) {
        if (!active || requestId !== loadRequestSequenceRef.current) {
          return;
        }
        console.error("Failed to load meal", error);
        showToastRef.current("기록을 불러오지 못했습니다.", "error");
        router.push("/");
      } finally {
        if (active && requestId === loadRequestSequenceRef.current) {
          setLoading(false);
        }
      }
    };

    void loadMeal();

    return () => {
      active = false;
    };
  }, [currentRole, currentUid, mealId, router]);

  if (!currentRole) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const requestId = ++imagePreviewRequestSequenceRef.current;

    void readMealImagePreview(file)
      .then((preview) => {
        if (requestId !== imagePreviewRequestSequenceRef.current) {
          return;
        }
        setImagePreview(preview);
      })
      .catch((error) => {
        if (requestId !== imagePreviewRequestSequenceRef.current) {
          return;
        }
        console.error("Failed to read meal image preview", error);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // legacy meals require owner migration before the server allows mutation
    if (requiresLegacyMigration) {
      showToast("등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다.", "error");
      return;
    }
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
      let imageUrl: string | null | undefined = imagePreview || undefined;
      if (isLocalMealImagePreview(imagePreview)) {
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

        {requiresLegacyMigration && (
          <div className="surface-card empty-state">
            <p className="empty-state-copy">
              등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          <SurfaceSection
            title="사진"
            actions={
              imagePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    imagePreviewRequestSequenceRef.current += 1;
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
                disabled={requiresLegacyMigration}
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
            disabled={requiresLegacyMigration}
            accept="image/*"
            style={{ display: "none" }}
          />

          <SurfaceSection title="식사 정보" bodyClassName="surface-body form-stack">
              <div>
                <label className="form-label">식사 종류</label>
                <div className="chip-group">
                  {VALID_MEAL_TYPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={requiresLegacyMigration}
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
                  {USER_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={requiresLegacyMigration}
                      onClick={() => setSelectedUsers((prev) => toggleMealParticipant(prev, role))}
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
                  disabled={requiresLegacyMigration}
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
            <button type="submit" disabled={isSubmitting || requiresLegacyMigration} className="primary-button">
              {isSubmitting ? "수정 중..." : <><Save size={18} /> 수정 완료</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
