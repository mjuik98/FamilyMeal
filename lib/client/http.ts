import {
  fetchAuthedJson as fetchAuthedJsonBase,
  getAccessToken as getAccessTokenBase,
  parseErrorMessage as parseErrorMessageBase,
} from "@/lib/client/auth-http";

export const getAccessToken = async (forceRefresh = false): Promise<string> =>
  getAccessTokenBase(forceRefresh);

export const parseErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => parseErrorMessageBase(response, fallback);

export const fetchAuthedJson = async <T>(input: string, init?: RequestInit): Promise<T> =>
  fetchAuthedJsonBase<T>(input, init);
