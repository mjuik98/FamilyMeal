import { QA_MOCK_MODE_KEY } from "@/lib/qa/storage";

export { QA_MOCK_MODE_KEY } from "@/lib/qa/storage";

export const isQaEnabled =
  process.env.NEXT_PUBLIC_ENABLE_QA === "true" ||
  process.env.NODE_ENV !== "production";

export const isQaMockEnabledByEnv = (
  env: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV">> = process.env
) => env.NODE_ENV !== "production";

export const isQaMockMode = () =>
  isQaMockEnabledByEnv() &&
  typeof window !== "undefined" &&
  window.localStorage.getItem(QA_MOCK_MODE_KEY) === "true";
