import { auth } from "@/lib/firebase";

export const getAccessToken = async (forceRefresh = false): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.getIdToken(forceRefresh);
};

export const parseErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => {
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

export const fetchAuthedJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const requestWithToken = async (forceRefresh = false): Promise<Response> => {
    const token = await getAccessToken(forceRefresh);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(input, {
      ...init,
      headers,
      cache: "no-store",
    });
  };

  let response = await requestWithToken(false);
  if (response.status === 401) {
    response = await requestWithToken(true);
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, `Request failed (${response.status})`);
    throw new Error(message);
  }

  return (await response.json()) as T;
};
