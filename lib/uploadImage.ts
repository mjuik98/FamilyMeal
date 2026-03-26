import { auth } from "./firebase";

const getAccessToken = async (forceRefresh = false): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.getIdToken(forceRefresh);
};

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    // Ignore JSON parse errors and use fallback.
  }
  return fallback;
};

const compressImageDataUri = (dataUri: string, maxWidth = 1200, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUri;
  });

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string" && reader.result.startsWith("data:")) {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });

const uploadViaServer = async (imageData: string, path?: string): Promise<string> => {
  const requestUpload = async (forceRefresh = false): Promise<Response> => {
    const token = await getAccessToken(forceRefresh);
    return fetch("/api/uploads/meal-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ imageData, path }),
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

export const uploadImage = async (
  imageData: string | File,
  path?: string
): Promise<string> => {
  const dataUri =
    typeof imageData === "string"
      ? imageData
      : await fileToDataUri(imageData);

  if (!dataUri.startsWith("data:image/")) {
    throw new Error("Only image data URIs are supported");
  }

  const compressedData = await compressImageDataUri(dataUri);
  return uploadViaServer(compressedData, path);
};
