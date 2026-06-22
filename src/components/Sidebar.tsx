'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData, BranchSelection } from '../context/DataContext';
import { useBusiness } from '../context/BusinessContext';
import { usePermissions, ALL_MODULES } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { useBranches } from '../context/BranchContext';
import { generateRandomSecret } from '../lib/totp';
import { getClientTenantSlug, getTenantDisplayName } from '../lib/tenant-client';

// Branch icons — default icon for any unlisted branch
const BRANCH_ICONS: Record<string, string> = {
    'All': '🌐',
    'Kampala Main': '🏢',
    'Jinja Showroom': '🏬',
    'Entebbe Hub': '✈️',
};
function getBranchIcon(name: string): string {
    return BRANCH_ICONS[name] ?? '🏪';
}


export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, enableMfa, disableMfa, isMfaEnabled } = useAuth();
    const { selectedBranch, setSelectedBranch, activeShift, endWorkShift, isLive, shipments, invoices, complianceRecords, repairOrders } = useData();
    const { business } = useBusiness();
    const { getAccessibleModules } = usePermissions();
    const { theme, toggleTheme } = useTheme();
    const { branches } = useBranches();
    // Dynamic branch list: ['All', ...branches from DB/settings]
    const ALL_BRANCHES: BranchSelection[] = ['All', ...branches];
    const [branchOpen, setBranchOpen] = useState(false);
    const [elapsed, setElapsed] = useState('');
    const [tenantSlug, setTenantSlug] = useState('garisphere');
    const [tenantDisplayName, setTenantDisplayName] = useState('GariSphere');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [allowedModules, setAllowedModules] = useState<string[]>(ALL_MODULES.map(m => m.key));

    // Fetch tenant-allowed modules on mount
    useEffect(() => {
        async function fetchTenantConfig() {
            try {
                const res = await fetch('/api/tenants');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.modules) {
                        setAllowedModules(data.modules);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch tenant configuration', err);
            }
        }
        fetchTenantConfig();
    }, []);

    // Resolve tenant slug client-side
    useEffect(() => {
        const slug = getClientTenantSlug();
        setTimeout(() => {
            setTenantSlug(slug);
            setTenantDisplayName(getTenantDisplayName(slug));
        }, 0);
    }, []);

    // Close mobile sidebar on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Prevent body scroll when sidebar open on mobile
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.body.style.overflow = mobileOpen ? 'hidden' : '';
        }
        return () => { if (typeof document !== 'undefined') document.body.style.overflow = ''; };
    }, [mobileOpen]);

    // Profile & 2FA Modal state
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [mfaStep, setMfaStep] = useState<'none' | 'intro' | 'qr' | 'verify' | 'success'>('none');
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [mfaCopied, setMfaCopied] = useState(false);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid var(--border-color)',
        padding: '0.7rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        color: 'white',
        outline: 'none',
        fontFamily: 'inherit',
        fontSize: '0.9rem',
        boxSizing: 'border-box'
    };

    useEffect(() => {
        if (!activeShift) {
            setTimeout(() => setElapsed(''), 0);
            return;
        }
        const updateElapsed = () => {
            const start = new Date(activeShift.startTime).getTime();
            const diffMs = Date.now() - start;
            if (diffMs < 0) {
                setElapsed('0s');
                return;
            }
            const diffSecs = Math.floor(diffMs / 1000);
            const hrs = Math.floor(diffSecs / 3600);
            const mins = Math.floor((diffSecs % 3600) / 60);
            const secs = diffSecs % 60;
            const parts = [];
            if (hrs > 0) parts.push(`${hrs}h`);
            if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
            parts.push(`${secs}s`);
            setElapsed(parts.join(' '));
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeShift]);

    const isGlobal = user?.role === 'Admin' || user?.role === 'Finance';

    // Build nav from permissions
    const navItems = user
        ? getAccessibleModules(user.role).map(m => ({ label: m.label, path: m.path, icon: m.icon, key: m.key }))
        : [];

    const displayedNavItems = navItems.filter(item => {
        if (item.key === 'settings') return true;
        return allowedModules.includes(item.key);
    });

    // Alert calculation for notification badge
    const today = new Date();
    let alertCount = 0;
    
    if (user) {
        const bShipments = (shipments || []).filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
        const bInvoices = (invoices || []).filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
        const bCompliance = (complianceRecords || []).filter(c => selectedBranch === 'All' || c.branch === selectedBranch);
        const bROs = (repairOrders || []).filter(r => selectedBranch === 'All' || r.branch === selectedBranch);

        // 1. Expected Arrivals (<= 7 days)
        bShipments.forEach(s => {
            if (s.status === 'At Sea' || s.status === 'Port Clearance') {
                const etaDate = new Date(s.eta);
                const diffDays = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays <= 7) alertCount++;
            }
        });

        // 2. Overdue Invoices
        alertCount += bInvoices.filter(i => i.status === 'Overdue').length;

        // 3. E-signs Pending
        alertCount += bCompliance.filter(c => c.esign === 'Pending').length;

        // 4. Incomplete ROs
        alertCount += bROs.filter(r => r.status !== 'Completed').length;
    }

    const branchColor = selectedBranch === 'All'
        ? 'var(--secondary-accent)'
        : selectedBranch === 'Kampala Main'
            ? 'var(--primary)'
            : selectedBranch === 'Jinja Showroom'
                ? '#a78bfa'
                : '#34d399';

    return (
        <>
            {/* ── Hamburger button (mobile only) ── */}
            <button
                className="hamburger-btn"
                onClick={() => setMobileOpen(o => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            {/* ── Overlay (mobile only, when sidebar is open) ── */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={mobileOpen ? 'sidebar-open' : ''}
                style={{
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
                overflowY: 'auto',
                zIndex: 50
            }}>

            {/* Logo + Theme Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }}
                    onClick={() => router.push('/dashboard')}
                >
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: '#ffffff',
                        boxShadow: 'var(--shadow-glow)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '1.1rem', overflow: 'hidden', flexShrink: 0
                    }}>
                        {business.isRegistered ? (
                            business.logoImage ? (
                                <img src={business.logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '1.25rem' }}>{business.logoEmoji || '🏎'}</span>
                            )
                        ) : (
                            <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                        )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {business.isRegistered ? (business.name || 'GariSphere') : 'GariSphere DMS'}
                        </h2>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {business.isRegistered ? (business.tagline || 'DMS Platform') : 'DMS Platform'}
                        </p>
                    </div>
                </div>
                {/* Theme Toggle Icon Button */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    style={{
                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                        background: theme === 'light' ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${theme === 'light' ? 'rgba(234,88,12,0.25)' : 'rgba(255,255,255,0.12)'}`,
                        color: theme === 'light' ? 'var(--primary)' : '#94a3b8',
                        cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = theme === 'light' ? 'rgba(234,88,12,0.2)' : 'rgba(255,255,255,0.12)';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = theme === 'light' ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.color = theme === 'light' ? 'var(--primary)' : '#94a3b8';
                    }}
                >
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
            </div>

            {/* SaaS Workspace Badge */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: tenantSlug === 'garisphere'
                    ? 'rgba(249, 115, 22, 0.06)'
                    : 'rgba(139, 92, 246, 0.08)',
                border: `1px solid ${tenantSlug === 'garisphere' ? 'rgba(249,115,22,0.2)' : 'rgba(139,92,246,0.25)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '0.45rem 0.75rem',
            }}>
                <span style={{ fontSize: '0.75rem' }}>
                    {tenantSlug === 'garisphere' ? '🌐' : '🏢'}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workspace</p>
                    <p style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        margin: 0,
                        color: tenantSlug === 'garisphere' ? 'var(--primary)' : '#a78bfa',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {tenantDisplayName}
                    </p>
                </div>
                <span style={{
                    fontSize: '0.55rem',
                    background: tenantSlug === 'garisphere' ? 'rgba(249,115,22,0.15)' : 'rgba(139,92,246,0.2)',
                    color: tenantSlug === 'garisphere' ? 'var(--primary)' : '#a78bfa',
                    borderRadius: '4px',
                    padding: '0.15rem 0.35rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0
                }}>
                    SaaS
                </span>
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
                                {ALL_BRANCHES.map(b => {
                                    const bColor = b === 'All' ? 'var(--secondary-accent)' : 'var(--primary)';
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
                                            <span>{getBranchIcon(b)}</span>
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
                        <span style={{ fontSize: '0.9rem' }}>{getBranchIcon(selectedBranch)}</span>
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

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {displayedNavItems.map(item => {
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
                            {item.path === '/notifications' && alertCount > 0 && (
                                <span style={{
                                    marginLeft: 'auto',
                                    background: 'var(--danger)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '10px',
                                    lineHeight: 1,
                                    boxShadow: '0 0 6px var(--danger)'
                                }}>
                                    {alertCount}
                                </span>
                            )}
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
                    <div 
                        onClick={() => setShowSecurityModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer', padding: '0.25rem', borderRadius: 'var(--radius-sm)', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Click to manage profile and security settings"
                    >
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #c2410c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1rem', flexShrink: 0
                        }}>
                            {user.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--secondary-accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {user.role}
                                <span
                                    onClick={(e) => { e.stopPropagation(); localStorage.removeItem('garisphere_user'); window.location.reload(); }}
                                    style={{ fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }}
                                    title="Clear cached profile and reload"
                                >↻ Sync</span>
                            </p>
                        </div>
                    </div>
                    {activeShift && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.6rem 0.8rem',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                                <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: 'var(--success)', display: 'inline-block',
                                    animation: 'pulse 1.5s infinite',
                                    boxShadow: '0 0 6px var(--success)'
                                }} />
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Shift Active</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elapsed:</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>{elapsed}</span>
                            </div>
                            <button
                                onClick={endWorkShift}
                                style={{
                                    marginTop: '0.4rem',
                                    width: '100%',
                                    background: 'rgba(239,68,68,0.12)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    color: 'var(--danger)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.35rem 0',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                                }}
                            >
                                🔴 End Work Shift
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setShowSecurityModal(true)}
                        style={{
                            width: '100%',
                            background: 'rgba(249, 115, 22, 0.1)',
                            border: '1px solid rgba(249, 115, 22, 0.25)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.45rem 0',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(249, 115, 22, 0.18)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                        }}
                    >
                        🛡️ Profile & 2FA Security
                    </button>
                    {user.role === 'Admin' && (
                        <a
                            href="/platform"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '0.4rem', width: '100%',
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                color: '#a5b4fc',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.45rem 0',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                marginBottom: '0.5rem',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.15)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; }}
                        >
                            🛸 Platform Admin Console ↗
                        </a>
                    )}

                    <button
                        onClick={logout}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0',
                            fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        Sign Out
                    </button>
                    <div style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        background: isLive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        color: isLive ? 'var(--success)' : 'var(--danger)',
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isLive ? 'var(--success)' : 'var(--danger)',
                            boxShadow: `0 0 6px ${isLive ? 'var(--success)' : 'var(--danger)'}`
                        }} />
                        {isLive ? 'Database: Connected' : 'Database: Offline (Local)'}
                    </div>
                </div>
            )}
            </aside>

            {/* Profile & Security Modal */}
            {showSecurityModal && user && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)',
                    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1100, color: 'white'
                }}>
                    <div className="glass-panel" style={{
                        width: '500px', padding: '2.5rem', display: 'flex',
                        flexDirection: 'column', gap: '1.5rem', position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.7), 0 10px 10px -5px rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                    }}>
                        {/* Close button */}
                        <button 
                            onClick={() => { setShowSecurityModal(false); setMfaStep('none'); setMfaError(null); }}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
                        >✕</button>

                        <header style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🛡️ Profile & Security
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Configure login verification security settings</p>
                        </header>

                        {/* Profile Info Summary */}
                        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
                                {user.name.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{user.name}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                                    <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', color: 'var(--secondary-accent)' }}>Role: {user.role}</span>
                                    <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{user.branch}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2-Step Authentication Content Block */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🔑 2-Step Authentication (2FA)
                            </h4>

                            {mfaStep === 'none' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                                        Protect your GariSphere account with an extra verification step. When enabled, you will need to enter a 6-digit code generated by an Authenticator app (like Google Authenticator) each time you sign in.
                                    </p>

                                    {isMfaEnabled(user.email) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.88rem', fontWeight: 600, background: 'rgba(34,197,94,0.08)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                <span>🔒</span> Active (Protects login sessions)
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('Are you sure you want to deactivate 2-Step Authentication? Your account will be less secure.')) {
                                                        await disableMfa();
                                                        alert('Two-factor authentication disabled.');
                                                    }
                                                }}
                                                className="btn-outline" 
                                                style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.25)', width: '100%' }}
                                            >
                                                Deactivate 2FA
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setMfaStep('intro')} className="btn-primary" style={{ width: '100%' }}>
                                            🔒 Configure 2-Step Verification
                                        </button>
                                    )}
                                </div>
                            )}

                            {mfaStep === 'intro' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                                        To set up 2-step verification, you will need a TOTP authenticator app on your smartphone, such as Google Authenticator, Microsoft Authenticator, or Authy.
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => { setMfaSecret(generateRandomSecret()); setMfaStep('qr'); }} className="btn-primary" style={{ flex: 1 }}>Get Started</button>
                                        <button onClick={() => setMfaStep('none')} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {mfaStep === 'qr' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                                        Scan this QR code with your authenticator app:
                                    </p>
                                    
                                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`otpauth://totp/GariSphere:${user.email}?secret=${mfaSecret}&issuer=GariSphere`)}`} 
                                            alt="Scan setup QR code"
                                            style={{ display: 'block', width: '150px', height: '150px' }}
                                        />
                                    </div>

                                    <div style={{ width: '100%' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Or enter this code manually:</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                            <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px', fontSize: '0.9rem', color: 'var(--secondary-accent)' }}>{mfaSecret}</span>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(mfaSecret); setMfaCopied(true); setTimeout(() => setMfaCopied(false), 2000); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                            >
                                                {mfaCopied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                        <button onClick={() => setMfaStep('verify')} className="btn-primary" style={{ flex: 1 }}>Next Step →</button>
                                        <button onClick={() => { setMfaStep('none'); setMfaCode(''); }} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {mfaStep === 'verify' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                                        Enter the 6-digit verification code generated by your app:
                                    </p>

                                    {mfaError && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>
                                            ⚠️ {mfaError}
                                        </div>
                                    )}

                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        placeholder="000 000"
                                        value={mfaCode}
                                        onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        style={{ ...inputStyle, textAlign: 'center', fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '4px' }}
                                        autoFocus
                                    />

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={async () => {
                                                setMfaError(null);
                                                const res = await enableMfa(mfaSecret, mfaCode);
                                                if (res.success && res.backupCodes) {
                                                    setMfaBackupCodes(res.backupCodes);
                                                    setMfaStep('success');
                                                    setMfaCode('');
                                                } else {
                                                    setMfaError(res.error || 'Verification code does not match.');
                                                }
                                            }}
                                            className="btn-primary" 
                                            style={{ flex: 1 }}
                                            disabled={mfaCode.length < 6}
                                        >
                                            Confirm & Activate
                                        </button>
                                        <button onClick={() => setMfaStep('qr')} className="btn-outline" style={{ flex: 1 }}>Back</button>
                                    </div>
                                </div>
                            )}

                            {mfaStep === 'success' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '2.5rem' }}>🎉</span>
                                        <h4 style={{ color: 'var(--success)', margin: '0.5rem 0 0 0', fontWeight: 800 }}>MFA Enabled Successfully!</h4>
                                    </div>
                                    
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                                        Store these recovery backup codes safely. They can be used to log in in place of an OTP if you ever lose your phone:
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'center' }}>
                                        {mfaBackupCodes.map((code, idx) => (
                                            <div key={idx} style={{ color: 'white', fontWeight: 600 }}>{code}</div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(mfaBackupCodes.join('\n'));
                                            setMfaCopied(true);
                                            setTimeout(() => setMfaCopied(false), 2000);
                                        }}
                                        className="btn-outline"
                                        style={{ width: '100%', fontSize: '0.8rem' }}
                                    >
                                        {mfaCopied ? '✓ Copied to Clipboard!' : '📋 Copy Backup Codes'}
                                    </button>

                                    <button 
                                        onClick={() => { setShowSecurityModal(false); setMfaStep('none'); }}
                                        className="btn-primary" 
                                        style={{ width: '100%' }}
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
