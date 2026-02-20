"use client";

import { createContext, useContext, useState, useCallback } from 'react';

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
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    {/* Backdrop */}
                    <div onClick={() => handleClose(false)}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
                        }} />
                    {/* Dialog */}
                    <div style={{
                        position: 'relative', background: 'var(--card)',
                        borderRadius: '20px', padding: '24px',
                        maxWidth: '340px', width: '100%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        animation: 'dialogIn 0.2s ease'
                    }}>
                        <h3 style={{
                            fontSize: '1.1rem', fontWeight: 700,
                            marginBottom: '8px'
                        }}>
                            {options.title}
                        </h3>
                        <p style={{
                            fontSize: '0.9rem', color: 'var(--muted-foreground)',
                            marginBottom: '24px', lineHeight: 1.5
                        }}>
                            {options.message}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleClose(false)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px',
                                    background: 'var(--muted)', color: 'var(--foreground)',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem'
                                }}>
                                {options.cancelText || '취소'}
                            </button>
                            <button onClick={() => handleClose(true)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px',
                                    background: options.danger ? '#DC2626' : 'var(--primary)',
                                    color: 'white', border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem'
                                }}>
                                {options.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes dialogIn {
                            from { opacity: 0; transform: scale(0.95) translateY(8px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
    return context;
}
