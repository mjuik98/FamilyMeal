import type { UserRole } from "@/lib/types";

export const readMealImagePreview = async (file: File): Promise<string> =>
  URL.createObjectURL(file);

export const revokeMealImagePreview = (previewUrl: string | null | undefined): void => {
  if (typeof previewUrl !== "string" || !previewUrl.startsWith("blob:")) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
};

export const readMealImageDataUrl = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image preview"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image preview"));
    reader.readAsDataURL(file);
  });

export const toggleMealParticipant = (
  participants: UserRole[],
  role: UserRole
): UserRole[] => {
  if (participants.includes(role)) {
    if (participants.length === 1) return participants;
    return participants.filter((item) => item !== role);
  }

  return [...participants, role];
};
