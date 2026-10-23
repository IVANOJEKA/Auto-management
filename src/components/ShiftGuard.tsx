'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Sidebar from './Sidebar';

// Routes that are publicly accessible without login or shift activation
const PUBLIC_PATHS = ['/', '/login'];

export default function ShiftGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { activeShift, startWorkShift } = useData();
    const pathname = usePathname();
    const [time, setTime] = useState<Date>(new Date());
    const [isClient, setIsClient] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // All hooks must be called unconditionally before any early returns
    useEffect(() => {
        setTimeout(() => setIsClient(true), 0);
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Allow public access to landing page and login without any guard
    if (PUBLIC_PATHS.includes(pathname)) {
        return <>{children}</>;
    }

    // Loader while authenticating
    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--bg-dark)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.5rem',
                color: 'var(--text-main)',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 35px var(--primary-glow)',
                    animation: 'pulse 1.8s infinite',
                    overflow: 'hidden'
                }}>
                    <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    CONNECTING TO GARISPHERE...
                </div>
            </div>
        );
    }

    // If not authenticated, render normally (allows viewing the login page)
    if (!isAuthenticated || !user) {
        return <>{children}</>;
    }

    // If authenticated but no active shift, keep the Sidebar visible but lock the main panel on the right
    if (activeShift === null) {
        const timeString = isClient ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--:--';
        const dateString = isClient ? time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : '---';

        const handleStart = async () => {
            setIsStarting(true);
            try {
                await startWorkShift();
            } finally {
                setIsStarting(false);
            }
        };

        return (
            <div className="gs-shift-page">
                {/* Keep Left Sidebar visible for an integrated 'Inside the System' feel */}
                <Sidebar />

                {/* Lock the right workspace and prompt shift activation */}
                <main className="gs-shift-main">
                    {/* Background decorative ambient glows */}
                    <div style={{ position: 'absolute', top: '15%', right: '15%', width: '320px', height: '320px', background: 'var(--primary)', filter: 'blur(160px)', opacity: 0.12, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '15%', left: '20%', width: '350px', height: '350px', background: 'var(--secondary-accent)', filter: 'blur(180px)', opacity: 0.08, pointerEvents: 'none' }} />

                    <div className="gs-shift-card">
                        {/* Title Indicator */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.85rem',
                            borderRadius: '50px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#f59e0b',
                                display: 'inline-block',
                                boxShadow: '0 0 10px #f59e0b',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Shift Activation Required
                            </span>
                        </div>

                        {/* Digital Clock */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', width: '100%' }}>
                            <h2 className="gs-shift-clock">{timeString}</h2>
                            <p className="gs-shift-date">{dateString}</p>
                        </div>

                        {/* User Details */}
                        <div className="gs-shift-user-box">
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #003db8 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.25rem',
                                color: '#ffffff',
                                boxShadow: '0 6px 18px var(--primary-glow)'
                            }}>
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <h4 className="gs-shift-user-name">{user.name}</h4>
                                <p className="gs-shift-user-email">{user.email}</p>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        background: 'rgba(0, 102, 255, 0.14)',
                                        color: 'var(--primary)',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        border: '1px solid rgba(0, 102, 255, 0.25)'
                                    }}>
                                        {user.role}
                                    </span>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        background: 'rgba(56, 189, 248, 0.14)',
                                        color: 'var(--secondary-accent)',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        border: '1px solid rgba(56, 189, 248, 0.25)'
                                    }}>
                                        {user.branch}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Shift Info Feature Highlights */}
                        <div className="gs-shift-features">
                            <div className="gs-shift-feature-chip">
                                <span>⏱</span>
                                <span className="gs-shift-feature-label">Time Log</span>
                                <span className="gs-shift-feature-desc">Work hours clocked</span>
                            </div>
                            <div className="gs-shift-feature-chip">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </span>
                                <span className="gs-shift-feature-label">Security</span>
                                <span className="gs-shift-feature-desc">Audit trail protected</span>
                            </div>
                            <div className="gs-shift-feature-chip">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </span>
                                <span className="gs-shift-feature-label">Terminal</span>
                                <span className="gs-shift-feature-desc">{user.branch}</span>
                            </div>
                        </div>

                        {/* Policy Notice */}
                        <p className="gs-shift-notice">
                            Attendance, deal sign-offs, and fiscal transactions are time-stamped with your staff signature. Please activate your shift to unlock your branch workspace.
                        </p>

                        {/* Action Buttons */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                style={{
                                    width: '100%',
                                    padding: '0.95rem 1.75rem',
                                    border: 'none',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, #0052cc 100%)',
                                    color: '#ffffff',
                                    fontSize: '0.98rem',
                                    fontWeight: 700,
                                    cursor: isStarting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 8px 24px -4px var(--primary-glow)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.6rem',
                                    opacity: isStarting ? 0.75 : 1
                                }}
                                onMouseEnter={e => {
                                    if (!isStarting) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 30px -4px var(--primary-glow)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 8px 24px -4px var(--primary-glow)';
                                }}
                            >
                                <span>{isStarting ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                                )}</span>
                                {isStarting ? 'Activating Shift...' : 'Start Work Shift'}
                            </button>

                            {/* Switch Account / Logout */}
                            <button
                                onClick={() => logout()}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    padding: '0.4rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                                <span>↪</span> Not {user.name}? Sign out or switch account
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Shift active: unlock system
    return <>{children}</>;
}
