import { auth } from "@/lib/firebase";
import { normalizeErrorCode } from "@/lib/platform/errors/error-contract";

type RouteErrorPayload = {
  code?: unknown;
  message?: unknown;
};

type RouteErrorEnvelope = {
  error?: unknown;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

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
  const details = await parseErrorDetails(response, fallback);
  return details.message;
};

export const parseErrorDetails = async (
  response: Response,
  fallback: string
): Promise<{ code: string; message: string; status: number }> => {
  try {
    const payload = (await response.json()) as RouteErrorEnvelope;
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return {
        code: normalizeErrorCode(payload.error, "request_failed"),
        message: payload.error,
        status: response.status,
      };
    }

    const structuredError = payload?.error as RouteErrorPayload | undefined;
    if (
      structuredError &&
      typeof structuredError.message === "string" &&
      structuredError.message.trim().length > 0
    ) {
      return {
        code:
          typeof structuredError.code === "string" && structuredError.code.trim().length > 0
            ? normalizeErrorCode(structuredError.code, "request_failed")
            : normalizeErrorCode(structuredError.message, "request_failed"),
        message: structuredError.message,
        status: response.status,
      };
    }
  } catch {
    // Ignore JSON parse errors and use fallback.
  }

  return {
    code: normalizeErrorCode(fallback, "request_failed"),
    message: fallback,
    status: response.status,
  };
};

export const toApiError = async (
  response: Response,
  fallback: string
): Promise<ApiError> => {
  const { code, message, status } = await parseErrorDetails(response, fallback);
  return new ApiError(message, status, code);
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
    throw await toApiError(response, `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
};
