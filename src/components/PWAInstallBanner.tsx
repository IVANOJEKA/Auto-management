'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from './PWAProvider';

export default function PWAInstallBanner() {
    const { isStandalone, isInstallable, installPWA } = usePWA();
    const [dismissed, setDismissed] = useState(true);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Check if user dismissed previously
        const isDismissed = localStorage.getItem('garisphere_pwa_banner_dismissed') === 'true';
        setDismissed(isDismissed);

        // Check if device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('garisphere_pwa_banner_dismissed', 'true');
    };

    // Don't render if running in standalone PWA mode or if dismissed
    if (isStandalone || dismissed) return null;

    // Render banner if installable (native prompt) or if on iOS
    if (!isInstallable && !isIOS) return null;

    return (
        <div
            style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(9, 13, 22, 0.98))',
                border: '1px solid rgba(0, 102, 255, 0.35)',
                borderRadius: '16px',
                padding: '1.25rem 1.75rem',
                margin: '2rem auto 0 auto',
                maxWidth: '860px',
                width: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 10px 30px rgba(0, 102, 255, 0.15)',
                backdropFilter: 'blur(15px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
                <div
                    style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(0, 102, 255, 0.3)',
                        flexShrink: 0,
                        padding: '6px'
                    }}
                >
                    <img src="/garisphere-logo.png" alt="GariSphere App Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
                        GET THE GARISPHERE APP
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', fontFamily: "'Outfit', sans-serif" }}>
                        Install GariSphere Desktop & Mobile App
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Install GariSphere on your device for faster, 1-click access to your dealership management system.
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isInstallable ? (
                    <button
                        onClick={installPWA}
                        style={{
                            background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                            color: 'white',
                            border: 'none',
                            padding: '0.7rem 1.4rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            fontFamily: "'Outfit', sans-serif",
                            boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <span>📲</span> INSTALL GARISPHERE
                    </button>
                ) : isIOS ? (
                    <button
                        onClick={() => setShowIOSGuide(!showIOSGuide)}
                        style={{
                            background: 'rgba(0, 102, 255, 0.15)',
                            border: '1px solid rgba(0, 102, 255, 0.4)',
                            color: '#38bdf8',
                            padding: '0.7rem 1.25rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontFamily: "'Outfit', sans-serif",
                            whiteSpace: 'nowrap'
                        }}
                    >
                        📲 Install on iOS
                    </button>
                ) : null}

                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss banner"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                    ✕
                </button>
            </div>

            {/* iOS Guide Popup */}
            {showIOSGuide && (
                <div
                    style={{
                        width: '100%',
                        background: 'rgba(0, 102, 255, 0.1)',
                        border: '1px border-dashed rgba(0, 102, 255, 0.3)',
                        borderRadius: '10px',
                        padding: '0.85rem 1.1rem',
                        fontSize: '0.82rem',
                        color: '#e2e8f0',
                        marginTop: '0.5rem',
                        lineHeight: 1.5
                    }}
                >
                    <strong>📱 To install GariSphere on iPhone/iPad:</strong><br />
                    1. Tap the <strong>Share</strong> button in Safari toolbar below.<br />
                    2. Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.<br />
                    3. Tap <strong>Add</strong> to launch GariSphere like a native application!
                </div>
            )}
        </div>
    );
}
