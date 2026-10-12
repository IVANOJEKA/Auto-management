'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';

function NavIconOverview() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
    );
}

function NavIconTenants() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
    );
}

function NavIconAnalytics() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

const NAV_ITEMS = [
    { label: 'Overview', path: '/platform', icon: <NavIconOverview /> },
    { label: 'Tenants', path: '/platform/tenants', icon: <NavIconTenants /> },
    { label: 'Analytics', path: '/platform/analytics', icon: <NavIconAnalytics /> },
];

interface PlatformNavProps {
    onLogout: () => void;
}

export default function PlatformNav({ onLogout }: PlatformNavProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === 'light';

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem', height: '64px',
            background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(7, 10, 24, 0.85)',
            borderBottom: `1px solid ${isLight ? 'rgba(0, 102, 255, 0.12)' : 'rgba(99, 102, 241, 0.18)'}`,
            backdropFilter: 'blur(20px)',
            boxShadow: isLight ? '0 4px 20px rgba(0, 82, 224, 0.06)' : '0 4px 24px rgba(0, 0, 0, 0.4)',
            position: 'sticky', top: 0, zIndex: 100,
            transition: 'background 0.3s, border-color 0.3s',
        }}>
            {/* Logo */}
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                onClick={() => router.push('/platform')}
            >
                <div style={{
                    width: '32px', height: '32px',
                    background: 'white',
                    borderRadius: '8px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                    boxShadow: isLight ? '0 0 16px rgba(0, 102, 255, 0.25)' : '0 0 16px rgba(99, 102, 241, 0.4)',
                }}>
                    <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: isLight ? '#0c1630' : 'white' }}>GariSphere</span>
                    <span style={{
                        marginLeft: '0.5rem', fontSize: '0.62rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, #0066ff, #6366f1)',
                        color: 'white',
                        padding: '0.18rem 0.5rem', borderRadius: '4px',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        boxShadow: '0 0 10px rgba(0, 102, 255, 0.35)',
                    }}>Platform</span>
                </div>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                background: isActive
                                    ? (isLight ? 'rgba(0, 102, 255, 0.1)' : 'rgba(99, 102, 241, 0.16)')
                                    : 'transparent',
                                color: isActive
                                    ? (isLight ? '#0052cc' : '#a5b4fc')
                                    : (isLight ? '#475569' : 'rgba(255, 255, 255, 0.6)'),
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.84rem', cursor: 'pointer',
                                borderBottom: isActive ? `2px solid ${isLight ? '#0052cc' : '#6366f1'}` : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = isLight ? 'rgba(0, 102, 255, 0.05)' : 'rgba(99, 102, 241, 0.08)';
                                    e.currentTarget.style.color = isLight ? '#0c1630' : 'white';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = isLight ? '#475569' : 'rgba(255, 255, 255, 0.6)';
                                }
                            }}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    title={isLight ? 'Switch to Dark Mode' : 'Switch to Professional Light Mode'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                        background: isLight ? 'rgba(0, 102, 255, 0.08)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isLight ? 'rgba(0, 102, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)'}`,
                        borderRadius: '8px', padding: '0.42rem 0.75rem',
                        color: isLight ? '#0052cc' : '#e2e8f0',
                        fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.18s',
                    }}
                >
                    {isLight ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                            <span>Dark</span>
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                            <span>Light Mode</span>
                        </>
                    )}
                </button>

                <Link href="/"
                    style={{
                        fontSize: '0.76rem',
                        color: isLight ? '#64748b' : 'rgba(255, 255, 255, 0.45)',
                        textDecoration: 'none',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = isLight ? '#0c1630' : 'white'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isLight ? '#64748b' : 'rgba(255, 255, 255, 0.45)'}
                >
                    Open DMS ↗
                </Link>

                <button
                    onClick={onLogout}
                    style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '8px', padding: '0.4rem 0.85rem',
                        color: '#ef4444', fontSize: '0.76rem', cursor: 'pointer',
                        fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                >
                    Sign Out
                </button>
            </div>
        </nav>
    );
}
