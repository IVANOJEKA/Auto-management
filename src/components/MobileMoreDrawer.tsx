'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import {
    IconVehicles,
    IconCustomers,
    IconSales,
    IconWorkshop,
    IconParts,
    IconLogistics,
    IconCompliance,
    IconFinance,
    IconReports,
    IconUsers,
    IconAuditTrail,
    IconSettings
} from './SidebarIcons';

interface MobileMoreDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MobileMoreDrawer({ isOpen, onClose }: MobileMoreDrawerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { getAccessibleModules } = usePermissions();
    const accessible = user ? getAccessibleModules(user.role).map(m => m.key) : [];

    if (!isOpen || !user) return null;

    const navigateTo = (path: string) => {
        onClose();
        router.push(path);
    };

    const isAllowed = (moduleKey: string) => {
        if (moduleKey === 'dashboard' || user.role === 'Admin') return true;
        return accessible.includes(moduleKey);
    };

    const sections = [
        {
            title: 'OPERATIONS',
            items: [
                { label: 'Vehicles & Stock', path: '/inventory', icon: <IconVehicles size={18} />, key: 'inventory', badge: null },
                { label: 'Customers & CRM', path: '/crm', icon: <IconCustomers size={18} />, key: 'crm', badge: null },
                { label: 'Sales Pipelines', path: '/sales', icon: <IconSales size={18} />, key: 'sales', badge: null },
                { label: 'Workshop Jobs', path: '/service', icon: <IconWorkshop size={18} />, key: 'service', badge: null },
                { label: 'Spare Parts POS', path: '/parts', icon: <IconParts size={18} />, key: 'parts', badge: null },
                { label: 'Logistics & Imports', path: '/logistics', icon: <IconLogistics size={18} />, key: 'logistics', badge: null },
                { label: 'Compliance & Logbooks', path: '/compliance', icon: <IconCompliance size={18} />, key: 'compliance', badge: null },
            ]
        },
        {
            title: 'FINANCE & REPORTS',
            items: [
                { label: 'Invoices & Ledger', path: '/finance', icon: <IconFinance size={18} />, key: 'finance', badge: null },
                { label: 'Executive Reports', path: '/reports', icon: <IconReports size={18} />, key: 'reports', badge: null },
            ]
        },
        {
            title: 'ADMINISTRATION',
            items: [
                { label: 'Staff & Permissions', path: '/users', icon: <IconUsers size={18} />, key: 'users', badge: null },
                { label: 'Audit Trail', path: '/admin/audit-trail', icon: <IconAuditTrail size={18} />, key: 'audit-trail', badge: null },
                { label: 'Dealership Settings', path: '/settings', icon: <IconSettings size={18} />, key: 'settings', badge: null },
            ]
        }
    ];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(2, 6, 23, 0.82)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                animation: 'backdropIn 0.2s ease forwards'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    maxHeight: '85vh',
                    background: '#090d16',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    padding: '1.5rem 1.25rem',
                    paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    overflowY: 'auto',
                    boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.6)'
                }}
            >
                {/* Drawer Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: 'white',
                            fontSize: '1.1rem'
                        }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>{user.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                                Role: <span style={{ color: '#38bdf8' }}>{user.role}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'white',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Module Sections */}
                {sections.map(sec => {
                    const filteredItems = sec.items.filter(item => isAllowed(item.key));
                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={sec.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.2rem 0.2rem' }}>
                                {sec.title}
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                                {filteredItems.map(item => {
                                    const isActive = pathname === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => navigateTo(item.path)}
                                            style={{
                                                background: isActive ? 'rgba(0, 102, 255, 0.18)' : 'rgba(255, 255, 255, 0.035)',
                                                border: `1px solid ${isActive ? '#0066ff' : 'rgba(255, 255, 255, 0.08)'}`,
                                                borderRadius: '14px',
                                                padding: '0.75rem 0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                                fontWeight: isActive ? 700 : 500,
                                                fontSize: '0.85rem',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.label}
                                            </span>
                                            {item.badge && (
                                                <span style={{ fontSize: '0.6rem', background: '#0066ff', color: 'white', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Bottom Sign Out Button */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                    <button
                        onClick={() => { onClose(); logout(); }}
                        style={{
                            width: '100%',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span> Sign Out of GariSphere
                    </button>
                </div>
            </div>
        </div>
    );
}
