'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Sidebar from './Sidebar';

export default function ShiftGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { activeShift, startWorkShift } = useData();
    const [time, setTime] = useState<Date>(new Date());
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Loader while authenticating
    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#090d16',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.5rem',
                color: 'white',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--primary), #c2410c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)',
                    animation: 'pulse 1.8s infinite'
                }}>🏎</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CONNECTING TO GARISPHERE...</div>
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

        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', overflow: 'hidden' }}>
                {/* Keep Left Sidebar visible for an integrated 'Inside the System' feel */}
                <Sidebar />

                {/* Lock the right workspace and prompt shift activation */}
                <main style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: 'white',
                    padding: '2.5rem',
                    position: 'relative',
                    overflowY: 'auto'
                }}>
                    {/* Background decorative glows */}
                    <div style={{ position: 'absolute', top: '10%', right: '15%', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '10%', left: '15%', width: '350px', height: '350px', background: '#a78bfa', filter: 'blur(160px)', opacity: 0.08, pointerEvents: 'none' }} />

                    <div style={{
                        width: '100%',
                        maxWidth: '460px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '2.5rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.75rem',
                        position: 'relative',
                        zIndex: 2
                    }}>
                        {/* Title Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: 'var(--warning)', display: 'inline-block',
                                boxShadow: '0 0 8px var(--warning)',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--warning)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Shift Activation Required</span>
                        </div>

                        {/* Digital Clock */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <h2 style={{
                                fontSize: '3rem',
                                fontWeight: 800,
                                margin: 0,
                                fontFamily: 'monospace',
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0 0 20px rgba(255,255,255,0.08)'
                            }}>{timeString}</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--secondary-accent)', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dateString}</p>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 50%, transparent)' }} />

                        {/* User Details */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.6rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            padding: '1.2rem',
                            borderRadius: '16px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), #c2410c)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '1.1rem', color: 'white',
                                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)'
                            }}>
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.15rem 0', fontWeight: 600 }}>{user.name}</h4>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0' }}>{user.email}</p>
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        background: 'rgba(249, 115, 22, 0.12)',
                                        color: 'var(--primary)',
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '50px',
                                        border: '1px solid rgba(249, 115, 22, 0.2)'
                                    }}>{user.role}</span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        background: 'rgba(167, 139, 250, 0.12)',
                                        color: '#a78bfa',
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '50px',
                                        border: '1px solid rgba(167, 139, 250, 0.2)'
                                    }}>{user.branch}</span>
                                </div>
                            </div>
                        </div>

                        {/* Policy Notice */}
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                            Attendance and work hours are automatically monitored. Please activate your shift to unlock your branch workspace.
                        </p>

                        {/* Start Shift Button */}
                        <button
                            onClick={startWorkShift}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1.5rem',
                                border: 'none',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #ea580c 100%)',
                                color: 'white',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 6px 16px -4px rgba(249, 115, 22, 0.35)',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(249, 115, 22, 0.45)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(249, 115, 22, 0.35)';
                            }}
                        >
                            <span>🚀</span> Start Work Shift
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Shift active: unlock system
    return <>{children}</>;
}
