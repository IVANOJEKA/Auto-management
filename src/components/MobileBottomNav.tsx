'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import MobileMoreDrawer from './MobileMoreDrawer';

export default function MobileBottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { getAccessibleModules } = usePermissions();
    const accessibleModules = user ? getAccessibleModules(user.role).map(m => m.key) : [];
    const [moreOpen, setMoreOpen] = useState(false);

    // Filter bottom navigation tabs based on user module access
    const navItems = [
        {
            label: 'Home',
            path: '/dashboard',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
            moduleKey: 'dashboard'
        },
        {
            label: 'Sales',
            path: '/sales',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            moduleKey: 'sales'
        },
        {
            label: 'Vehicles',
            path: '/inventory',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>,
            moduleKey: 'inventory'
        },
        {
            label: 'Customers',
            path: '/crm',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            moduleKey: 'crm'
        },
    ].filter(item => {
        if (item.moduleKey === 'dashboard') return true;
        return accessibleModules.includes(item.moduleKey);
    });

    return (
        <>
            <nav
                className="gs-mobile-bottom-nav"
                style={{
                    display: 'none', // Shown via CSS media query @media (max-width: 768px)
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    height: '62px',
                    background: 'rgba(9, 13, 22, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0 0.5rem',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
                }}
            >
                {navItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.2rem',
                                padding: '0.35rem 0',
                                color: isActive ? '#0066ff' : '#94a3b8',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 800 : 500, letterSpacing: '0.01em' }}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div style={{ width: '14px', height: '3px', borderRadius: '2px', background: '#0066ff', marginTop: '1px' }} />
                            )}
                        </button>
                    );
                })}

                {/* More / All Modules Tab */}
                <button
                    onClick={() => setMoreOpen(true)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        padding: '0.35rem 0',
                        color: moreOpen ? '#0066ff' : '#94a3b8',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                    <span style={{ fontSize: '0.68rem', fontWeight: moreOpen ? 800 : 500 }}>More</span>
                </button>
            </nav>

            {/* More Drawer Component */}
            <MobileMoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
    );
}
