'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
    { label: 'Overview', path: '/platform', icon: '📊' },
    { label: 'Tenants', path: '/platform/tenants', icon: '🏢' },
    { label: 'Analytics', path: '/platform/analytics', icon: '📈' },
];

interface PlatformNavProps {
    onLogout: () => void;
}

export default function PlatformNav({ onLogout }: PlatformNavProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem', height: '64px',
            background: 'rgba(6,6,20,0.8)',
            borderBottom: '1px solid rgba(99,102,241,0.15)',
            backdropFilter: 'blur(20px)',
            position: 'sticky', top: 0, zIndex: 100,
        }}>
            {/* Logo */}
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                onClick={() => router.push('/platform')}
            >
                <div style={{
                    width: '32px', height: '32px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1rem',
                    boxShadow: '0 0 16px rgba(99,102,241,0.4)',
                }}>🛸</div>
                <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>GariSphere</span>
                    <span style={{
                        marginLeft: '0.5rem', fontSize: '0.6rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        padding: '0.15rem 0.4rem', borderRadius: '4px',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>Platform</span>
                </div>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                                fontWeight: isActive ? 700 : 400,
                                fontSize: '0.85rem', cursor: 'pointer',
                                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                        >
                            <span style={{ fontSize: '0.8rem' }}>{item.icon}</span>
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/"
                    style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}
                >
                    ↗ Open DMS
                </Link>
                <button
                    onClick={onLogout}
                    style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px', padding: '0.4rem 0.85rem',
                        color: '#fca5a5', fontSize: '0.78rem', cursor: 'pointer',
                        fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                >
                    Sign Out
                </button>
            </div>
        </nav>
    );
}
