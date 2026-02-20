"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '440px',
                width: '90%',
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
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

    const bgColors: Record<ToastType, string> = {
        success: '#6B8E23',
        error: '#DC2626',
        info: '#1A1A1A',
    };

    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    return (
        <div
            onClick={onDismiss}
            style={{
                background: bgColors[toast.type],
                color: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                transform: visible ? 'translateY(0)' : 'translateY(-20px)',
                opacity: visible ? 1 : 0,
                transition: 'all 0.3s ease',
            }}
        >
            <span style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
                flexShrink: 0,
            }}>
                {icons[toast.type]}
            </span>
            {toast.message}
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}
