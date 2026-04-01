"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleClose = (result: boolean) => {
    resolveRef?.(result);
    setOptions(null);
    setResolveRef(null);
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {options && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => handleClose(false)}
            aria-hidden="true"
          />
          <div
            className="confirm-dialog surface-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <h3 id="confirm-dialog-title" className="confirm-title">
              {options.title}
            </h3>
            <p className="confirm-message">{options.message}</p>
            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="secondary-button confirm-button"
              >
                {options.cancelText || "취소"}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`confirm-button ${options.danger ? "danger-button" : "primary-button"}`}
              >
                {options.confirmText || "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within a ConfirmProvider");
  return context;
}
