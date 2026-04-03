import { getAccessToken, parseErrorMessage } from "@/lib/client/auth-http";

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
    const message = await parseErrorMessage(response, `Image upload failed (${response.status})`);
    throw new Error(message);
  }

  const payload = (await response.json()) as { imageUrl?: unknown };
  if (typeof payload.imageUrl !== "string" || payload.imageUrl.trim().length === 0) {
    throw new Error("Image upload response is missing imageUrl");
  }
  return payload.imageUrl;
};

export const uploadImage = async (imageFile: File): Promise<string> => uploadViaServer(imageFile);
