"use client";

import { useEffect, useRef } from "react";

const MAX_REPORTS = 3;
const REPORT_ENDPOINT = "/api/client-errors";

type ErrorPayload = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url: string;
  userAgent: string;
  timestamp: string;
};

const sendClientError = (payload: ErrorPayload) => {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(REPORT_ENDPOINT, blob);
    return;
  }

  fetch(REPORT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
};

export default function ClientErrorMonitor() {
  const sentCountRef = useRef(0);

  useEffect(() => {
    const send = (payload: ErrorPayload) => {
      if (sentCountRef.current >= MAX_REPORTS) {
        return;
      }

      sentCountRef.current += 1;
      sendClientError(payload);
    };

    const handleError = (event: ErrorEvent) => {
      send({
        type: "error",
        message: event.message || "Unknown error",
        stack: event.error?.stack ? String(event.error.stack) : undefined,
        source: event.filename || undefined,
        lineno: event.lineno || undefined,
        colno: event.colno || undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message
            ? String(event.reason.message)
            : "Unhandled promise rejection";

      send({
        type: "unhandledrejection",
        message: reason,
        stack: event.reason?.stack ? String(event.reason.stack) : undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
