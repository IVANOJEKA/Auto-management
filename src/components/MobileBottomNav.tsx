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
        { label: 'Home', path: '/dashboard', icon: '🏠', moduleKey: 'dashboard' },
        { label: 'Sales', path: '/sales', icon: '🤝', moduleKey: 'sales' },
        { label: 'Vehicles', path: '/inventory', icon: '🚗', moduleKey: 'inventory' },
        { label: 'Customers', path: '/crm', icon: '👥', moduleKey: 'crm' },
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
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⠿</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: moreOpen ? 800 : 500 }}>More</span>
                </button>
            </nav>

            {/* More Drawer Component */}
            <MobileMoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
    );
}
