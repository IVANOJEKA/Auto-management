'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PWAContextType {
    isStandalone: boolean;
    isInstallable: boolean;
    isOffline: boolean;
    installPWA: () => Promise<void>;
    updateAvailable: boolean;
    applyUpdate: () => void;
}

const PWAContext = createContext<PWAContextType>({
    isStandalone: false,
    isInstallable: false,
    isOffline: false,
    installPWA: async () => {},
    updateAvailable: false,
    applyUpdate: () => {},
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

    // 1. Detect standalone mode
    useEffect(() => {
        const checkStandalone = () => {
            const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone === true
                || document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMatch);

            // If running standalone and user lands on home '/', auto redirect to '/app'
            if (isStandaloneMatch && window.location.pathname === '/') {
                router.replace('/app');
            }
        };

        checkStandalone();
        window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);
    }, [router]);

    // 2. Offline / Online network status listener
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        if (typeof window !== 'undefined') {
            setIsOffline(!navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 3. Register Service Worker & handle updates
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    setSwRegistration(reg);

                    // Check if an update is waiting
                    if (reg.waiting) {
                        setUpdateAvailable(true);
                    }

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });
                })
                .catch((err) => {
                    console.log('[PWA] Service worker registration bypassed:', err);
                });

            // Listen for controller changes (reload when update applied)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, []);

    // 4. Capture native install prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Appinstalled event
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsStandalone(true);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsInstallable(false);
        }
    };

    const applyUpdate = () => {
        if (swRegistration && swRegistration.waiting) {
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
    };

    return (
        <PWAContext.Provider
            value={{
                isStandalone,
                isInstallable,
                isOffline,
                installPWA,
                updateAvailable,
                applyUpdate,
            }}
        >
            {children}

            {/* Offline Status Warning Bar */}
            {isOffline && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        background: '#f59e0b',
                        color: '#090d16',
                        padding: '0.5rem 1rem',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    }}
                >
                    <span>📡 You are offline.</span>
                    <span style={{ fontWeight: 400, opacity: 0.9 }}>
                        Some GariSphere functions require an active internet connection.
                    </span>
                </div>
            )}

            {/* Non-intrusive Version Update Alert */}
            {updateAvailable && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '1.5rem',
                        right: '1.5rem',
                        zIndex: 99999,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid #0066ff',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <div style={{ fontSize: '1.25rem' }}>⚡</div>
                    <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
                            New version available
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Update GariSphere DMS for the latest features
                        </div>
                    </div>
                    <button
                        onClick={applyUpdate}
                        style={{
                            background: '#0066ff',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Update GariSphere
                    </button>
                </div>
            )}
        </PWAContext.Provider>
    );
}
