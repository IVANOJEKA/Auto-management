'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData, BranchSelection } from '../context/DataContext';
import { useBusiness } from '../context/BusinessContext';

const BRANCHES: BranchSelection[] = ['All', 'Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];

const BRANCH_ICONS: Record<string, string> = {
    'All': '🌐',
    'Kampala Main': '🏢',
    'Jinja Showroom': '🏬',
    'Entebbe Hub': '✈️',
};

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { selectedBranch, setSelectedBranch } = useData();
    const { business } = useBusiness();
    const [branchOpen, setBranchOpen] = useState(false);

    const isGlobal = user?.role === 'Admin' || user?.role === 'Finance';

    const navItems = [
        { label: 'Dashboard', path: '/', icon: '⬛' },
        { label: 'Inventory (VIN)', path: '/inventory', icon: '🚗' },
        { label: 'Order & Logistics', path: '/logistics', icon: '🚢' },
        { label: 'CRM & Leads', path: '/crm', icon: '👥' },
        { label: 'Sales Desk', path: '/sales', icon: '💰' },
        { label: 'Appointments', path: '/appointments', icon: '📅' },
        { label: 'Quotations', path: '/quotes', icon: '📄' },
        { label: 'Supplier Directory', path: '/suppliers', icon: '🏦' },
        { label: 'Compliance Docs', path: '/compliance', icon: '📋' },
        { label: 'Service & e-RO', path: '/service', icon: '🔧' },
        { label: 'Notifications & Feed', path: '/notifications', icon: '🔔' },
    ];

    if (isGlobal) {
        navItems.push({ label: 'Finance & Accounts', path: '/finance', icon: '💳' });
        navItems.push({ label: 'Reports & Analytics', path: '/reports', icon: '📊' });
    }
    if (user?.role === 'Admin') {
        navItems.push({ label: 'Settings', path: '/settings', icon: '⚙️' });
    }

    const branchColor = selectedBranch === 'All'
        ? 'var(--secondary-accent)'
        : selectedBranch === 'Kampala Main'
            ? 'var(--primary)'
            : selectedBranch === 'Jinja Showroom'
                ? '#a78bfa'
                : '#34d399';

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            background: 'rgba(15, 23, 42, 0.95)',
            borderRight: '1px solid var(--border-color)',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto'
        }}>
            {/* Logo */}
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem', cursor: 'pointer' }}
                onClick={() => router.push('/')}
            >
                <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--primary), #f97316cc)',
                    boxShadow: 'var(--shadow-glow)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.1rem'
                }}>🏎</div>
                <div>
                    <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>GariSphere DMS</h2>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>DMS Platform</p>
                </div>
            </div>

            {/* Branch Selector */}
            <div style={{ position: 'relative' }}>
                {isGlobal ? (
                    /* Admin / Finance — clickable switcher */
                    <>
                        <button
                            onClick={() => setBranchOpen(o => !o)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.04)', border: `1px solid ${branchColor}55`,
                                borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem',
                                color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.9rem' }}>{BRANCH_ICONS[selectedBranch]}</span>
                                <span style={{ color: branchColor }}>{selectedBranch}</span>
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{branchOpen ? '▲' : '▼'}</span>
                        </button>
                        {branchOpen && (
                            <div style={{
                                position: 'absolute', top: '110%', left: 0, right: 0,
                                background: 'rgba(15,23,42,0.98)', border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)', zIndex: 200, overflow: 'hidden',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                            }}>
                                {BRANCHES.map(b => {
                                    const bColor = b === 'All' ? 'var(--secondary-accent)'
                                        : b === 'Kampala Main' ? 'var(--primary)'
                                        : b === 'Jinja Showroom' ? '#a78bfa' : '#34d399';
                                    return (
                                        <button
                                            key={b}
                                            onClick={() => { setSelectedBranch(b); setBranchOpen(false); }}
                                            style={{
                                                width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center',
                                                gap: '0.6rem', background: selectedBranch === b ? 'rgba(255,255,255,0.06)' : 'transparent',
                                                border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: selectedBranch === b ? bColor : 'var(--text-muted)',
                                                fontWeight: selectedBranch === b ? 700 : 400, textAlign: 'left',
                                                borderLeft: selectedBranch === b ? `3px solid ${bColor}` : '3px solid transparent',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span>{BRANCH_ICONS[b]}</span>
                                            {b}
                                            {selectedBranch === b && <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem', paddingLeft: '0.2rem' }}>
                            🔍 Global monitoring active
                        </p>
                    </>
                ) : (
                    /* Local operator — read-only locked badge */
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${branchColor}44`,
                        borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem'
                    }}>
                        <span style={{ fontSize: '0.9rem' }}>{BRANCH_ICONS[selectedBranch] || '🏢'}</span>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Your Branch</p>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: branchColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedBranch}
                            </p>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>🔒</span>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <a
                            key={item.path}
                            href="#"
                            onClick={(e) => { e.preventDefault(); router.push(item.path); }}
                            style={{
                                padding: '0.7rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                color: isActive ? 'white' : 'var(--text-muted)',
                                background: isActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'var(--transition)',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem'
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                    (e.currentTarget as HTMLElement).style.color = 'white';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                }
                            }}
                        >
                            <span style={{ fontSize: '0.85rem' }}>{item.icon}</span>
                            {item.label}
                        </a>
                    );
                })}
            </nav>

            {/* User Info at Bottom */}
            {user && (
                <div style={{
                    marginTop: 'auto',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #c2410c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1rem', flexShrink: 0
                        }}>
                            {user.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--secondary-accent)', margin: 0 }}>{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        style={{
                            width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0',
                            fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </aside>
    );
}
