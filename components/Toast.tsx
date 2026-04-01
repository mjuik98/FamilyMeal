"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";
type ToastPosition = "top" | "center";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  position: ToastPosition;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, position?: ToastPosition) => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", position: ToastPosition = "top") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type, position }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    },
    []
  );

  const topToasts = toasts.filter((toast) => toast.position === "top");
  const centerToasts = toasts.filter((toast) => toast.position === "center");

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-viewport toast-viewport-top">
        {topToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
          />
        ))}
      </div>
      <div className="toast-viewport toast-viewport-center">
        {centerToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`toast-item toast-item-${toast.type}${visible ? " toast-item-visible" : ""}`}
    >
      <span className="toast-icon" aria-hidden="true">
        {TOAST_ICONS[toast.type]}
      </span>
      <span>{toast.message}</span>
    </button>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
