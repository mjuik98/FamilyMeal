type LogPayload = Record<string, unknown> | undefined;

const buildLogArgs = (message: string, error?: unknown, payload?: LogPayload) => {
  if (payload && error !== undefined) {
    return [message, payload, error] as const;
  }
  if (payload) {
    return [message, payload] as const;
  }
  if (error !== undefined) {
    return [message, error] as const;
  }
  return [message] as const;
};

export const logError = (message: string, error?: unknown, payload?: LogPayload) => {
  console.error(...buildLogArgs(message, error, payload));
};

export const logWarn = (message: string, error?: unknown, payload?: LogPayload) => {
  console.warn(...buildLogArgs(message, error, payload));
};

export const logInfo = (message: string, payload?: LogPayload) => {
  console.info(...buildLogArgs(message, undefined, payload));
};
