import { getAccessToken, toApiError } from "@/lib/client/auth-http";

const uploadViaServer = async (imageFile: File): Promise<string> => {
  const requestUpload = async (forceRefresh = false): Promise<Response> => {
    const token = await getAccessToken(forceRefresh);
    const formData = new FormData();
    formData.append("file", imageFile, imageFile.name);

    return fetch("/api/uploads/meal-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: formData,
    });
  };

  let response = await requestUpload(false);
  if (response.status === 401) {
    response = await requestUpload(true);
  }

  if (!response.ok) {
    throw await toApiError(response, `Image upload failed (${response.status})`);
  }

  const payload = (await response.json()) as { imageUrl?: unknown };
  if (typeof payload.imageUrl !== "string" || payload.imageUrl.trim().length === 0) {
    throw new Error("Image upload response is missing imageUrl");
  }
  return payload.imageUrl;
};

const cleanupViaServer = async (imageUrl: string): Promise<void> => {
  const requestCleanup = async (forceRefresh = false): Promise<Response> => {
    const token = await getAccessToken(forceRefresh);

    return fetch("/api/uploads/meal-image", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ imageUrl }),
    });
  };

  let response = await requestCleanup(false);
  if (response.status === 401) {
    response = await requestCleanup(true);
  }

  if (!response.ok) {
    throw await toApiError(response, `Image cleanup failed (${response.status})`);
  }
};

export const uploadImage = async (imageFile: File): Promise<string> => uploadViaServer(imageFile);
export const cleanupUploadedMealImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl.trim()) {
    return;
  }

  await cleanupViaServer(imageUrl);
};
