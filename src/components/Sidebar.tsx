'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData, BranchSelection } from '../context/DataContext';
import { useBusiness } from '../context/BusinessContext';
import { usePermissions, ALL_MODULES } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
import { useBranches } from '../context/BranchContext';
import { generateRandomSecret } from '../lib/totp';
import { getClientTenantSlug, getTenantDisplayName } from '../lib/tenant-client';
import { usePWA } from './PWAProvider';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import {
    IconDashboard,
    IconSales,
    IconCustomers,
    IconVehicles,
    IconQuotations,
    IconDeals,
    IconWorkshop,
    IconRepairOrders,
    IconInventory,
    IconParts,
    IconLogistics,
    IconCompliance,
    IconFinance,
    IconInvoices,
    IconReports,
    IconUsers,
    IconBranches,
    IconAuditTrail,
    IconSettings,
    IconPlatform,
    IconChevronDown,
    IconChevronRight,
    IconSignOut,
    IconShield,
    IconSuppliers
} from './SidebarIcons';


// Branch labels
function getBranchIcon(name: string): string {
    return '';
}

interface NavGroupItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    key: string;
    badge?: number | null;
}

interface NavGroup {
    id: string;
    title: string;
    items: NavGroupItem[];
}

function SidebarInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, logout, enableMfa, disableMfa, isMfaEnabled } = useAuth();
    const { selectedBranch, setSelectedBranch, activeShift, endWorkShift, isLive, shipments, invoices, complianceRecords, repairOrders } = useData();
    const { business } = useBusiness();
    const { getAccessibleModules, hasAccess } = usePermissions();
    const { theme, toggleTheme } = useTheme();
    const { branches } = useBranches();
    const { isInstallable, installPWA } = usePWA();

    const ALL_BRANCHES: BranchSelection[] = ['All', ...branches];
    const [branchOpen, setBranchOpen] = useState(false);
    const [elapsed, setElapsed] = useState('');
    const [tenantSlug, setTenantSlug] = useState('garisphere');
    const [tenantDisplayName, setTenantDisplayName] = useState('GariSphere');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [allowedModules, setAllowedModules] = useState<string[]>(ALL_MODULES.map(m => m.key));

    // End shift confirmation modal state
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);

    // Collapsible Groups State
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
        MAIN: false,
        SALES: false,
        PRODUCTS: false,
        WORKSHOP: false,
        FINANCE: false,
        REPORTING: false,
        ADMIN: false
    });

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Helper: match sidebar item paths that may include ?tab= query params
    const isItemActive = (itemPath: string): boolean => {
        if (itemPath.includes('?')) {
            // Item has a query param (e.g. /sales?tab=pos) — match path + tab exactly
            const [p, q] = itemPath.split('?');
            const params = new URLSearchParams(q);
            const tabVal = params.get('tab');
            return pathname === p && searchParams.get('tab') === tabVal;
        }
        // Plain path item — only active when on that path with NO extra tab param
        // (prevents "All Sales" from highlighting when user is on /sales?tab=pos)
        return pathname === itemPath && !searchParams.get('tab');
    };

    // Close mobile sidebar and auto-expand active group on route change
    useEffect(() => {
        setMobileOpen(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

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
    const [qrError, setQrError] = useState(false);

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

    const isGlobal = user?.role === 'Admin';

    // Alert calculation for notification badge
    const today = new Date();
    let alertCount = 0;
    if (user) {
        const bShipments = (shipments || []).filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
        const bInvoices = (invoices || []).filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
        const bCompliance = (complianceRecords || []).filter(c => selectedBranch === 'All' || c.branch === selectedBranch);
        const bROs = (repairOrders || []).filter(r => selectedBranch === 'All' || r.branch === selectedBranch);

        bShipments.forEach(s => {
            if (s.status === 'At Sea' || s.status === 'Port Clearance') {
                const etaDate = new Date(s.eta);
                const diffDays = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays <= 7) alertCount++;
            }
        });
        alertCount += bInvoices.filter(i => i.status === 'Overdue').length;
        alertCount += bCompliance.filter(c => c.esign === 'Pending').length;
        alertCount += bROs.filter(r => r.status !== 'Completed').length;
    }

    const branchColor = selectedBranch === 'All'
        ? 'var(--secondary-accent)'
        : selectedBranch === 'Kampala Main'
            ? 'var(--primary)'
            : selectedBranch === 'Jinja Showroom'
                ? '#a78bfa'
                : '#34d399';

    // Accessible module keys for user
    const accessibleKeys = user ? getAccessibleModules(user.role).map(m => m.key) : [];

    const isModuleAllowed = (key: string) => {
        if (!user) return false;
        if (user.role === 'Admin' || key === 'dashboard') return true;
        return accessibleKeys.includes(key) && allowedModules.includes(key);
    };

    // Organized Desktop Navigation Groups (Navigation Integrity enforced)
    const navGroups: NavGroup[] = [
        {
            id: 'MAIN',
            title: 'MAIN',
            items: [
                { label: 'Dashboard', path: '/dashboard', icon: <IconDashboard />, key: 'dashboard' }
            ]
        },
        {
            id: 'SALES',
            title: 'SELL & CUSTOMERS',
            items: [
                { label: 'All Sales', path: '/sales', icon: <IconSales />, key: 'sales' },
                { label: 'POS Terminal', path: '/sales?tab=pos', icon: <IconParts />, key: 'sales' },
                { label: 'Drafts & Pending', path: '/sales?tab=drafts', icon: <IconDeals />, key: 'sales' },
                { label: 'Quotations', path: '/sales?tab=quotations', icon: <IconQuotations />, key: 'sales' },
                { label: 'Sell Returns', path: '/sales?tab=sell_return', icon: <IconReports />, key: 'sales' },
                { label: 'Shipments', path: '/sales?tab=shipments', icon: <IconLogistics />, key: 'sales' },
                { label: 'Discounts', path: '/sales?tab=discounts', icon: <IconFinance />, key: 'sales' },
                { label: 'Customers & CRM', path: '/crm', icon: <IconCustomers />, key: 'crm' },
            ]
        },
        {
            id: 'PRODUCTS',
            title: 'PRODUCTS & INVENTORY',
            items: [
                { label: 'List Products', path: '/inventory', icon: <IconInventory />, key: 'inventory' },
                { label: 'Add Product', path: '/inventory?tab=add_product', icon: <IconParts />, key: 'inventory' },
                { label: 'Update Price', path: '/inventory?tab=update_price', icon: <IconFinance />, key: 'inventory' },
                { label: 'Print Labels', path: '/inventory?tab=print_labels', icon: <IconQuotations />, key: 'inventory' },
                { label: 'Variations', path: '/inventory?tab=variations', icon: <IconDeals />, key: 'inventory' },
                { label: 'Stock Alerts & Report', path: '/inventory?tab=stock_report', icon: <IconReports />, key: 'inventory' },
                { label: 'Categories', path: '/inventory?tab=categories', icon: <IconCompliance />, key: 'inventory' },
                { label: 'Brands', path: '/inventory?tab=brands', icon: <IconVehicles />, key: 'inventory' },
                { label: 'Units', path: '/inventory?tab=units', icon: <IconWorkshop />, key: 'inventory' },
                { label: 'Warranties', path: '/inventory?tab=warranties', icon: <IconShield />, key: 'inventory' },
                { label: 'Dealership Vehicles', path: '/inventory?tab=vehicles', icon: <IconVehicles />, key: 'inventory' },
            ]
        },
        {
            id: 'WORKSHOP',
            title: 'WORKSHOP & OPERATIONS',
            items: [
                { label: 'Workshop & e-RO', path: '/service', icon: <IconWorkshop />, key: 'service' },
                { label: 'Parts Purchase Orders', path: '/parts?tab=orders', icon: <IconParts />, key: 'parts' },
                { label: 'Suppliers & Vendors', path: '/suppliers', icon: <IconSuppliers />, key: 'suppliers' },
                { label: 'Logistics & Imports', path: '/logistics', icon: <IconLogistics />, key: 'logistics' },
                { label: 'Compliance Docs', path: '/compliance', icon: <IconCompliance />, key: 'compliance' }
            ]
        },
        {
            id: 'FINANCE',
            title: 'FINANCE',
            items: [
                { label: 'Finance & Accounts', path: '/finance', icon: <IconFinance />, key: 'finance' }
            ]
        },
        {
            id: 'REPORTING',
            title: 'REPORTING',
            items: [
                { label: 'Reports & Analytics', path: '/reports', icon: <IconReports />, key: 'reports' }
            ]
        },
        {
            id: 'ADMIN',
            title: 'ADMINISTRATION',
            items: [
                { label: 'Users & Permissions', path: '/users', icon: <IconUsers />, key: 'users' },
                { label: 'Dealership Settings', path: '/settings', icon: <IconSettings />, key: 'settings' },
                { label: 'Audit Trail', path: '/admin/audit-trail', icon: <IconAuditTrail />, key: 'audit-trail' }
            ]
        }
    ];


    return (
        <>
            <MobileTopBar />

            {/* ── Hamburger button (mobile only) ── */}
            <button
                className="hamburger-btn"
                onClick={() => setMobileOpen(o => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            {/* ── Overlay (mobile only) ── */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={mobileOpen ? 'sidebar-open' : ''}
                style={{
                    width: 'var(--sidebar-width, 270px)',
                    background: '#070d19',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '1.25rem 0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxSizing: 'border-box'
                }}
            >

                {/* Brand Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.4rem' }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                        onClick={() => router.push('/dashboard')}
                    >
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: '#ffffff',
                            boxShadow: '0 0 16px rgba(0, 102, 255, 0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                        }}>
                            {business.isRegistered && business.logoImage ? (
                                <img src={business.logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                GARISPHERE
                            </h2>
                            <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0, fontWeight: 500, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Dealer Management System
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        style={{
                            width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', transition: 'all 0.2s',
                        }}
                    >
                        {theme === 'dark' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                        )}
                    </button>
                </div>

                {/* Branch Selector */}
                <div style={{ position: 'relative', margin: '0 0.1rem' }}>
                    {isGlobal ? (
                        <>
                            <button
                                onClick={() => setBranchOpen(o => !o)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(255,255,255,0.035)', border: `1px solid ${branchColor}44`,
                                    borderRadius: '10px', padding: '0.6rem 0.85rem',
                                    color: 'white', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                    <span style={{ color: branchColor, fontWeight: 700 }}>{selectedBranch}</span>
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{branchOpen ? '▲' : '▼'}</span>
                            </button>

                            {branchOpen && (
                                <div style={{
                                    position: 'absolute', top: '110%', left: 0, right: 0,
                                    background: '#0c1427', border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '10px', zIndex: 200, overflow: 'hidden',
                                    boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
                                }}>
                                    {ALL_BRANCHES.map(b => {
                                        const bColor = b === 'All' ? 'var(--secondary-accent)' : '#0066ff';
                                        return (
                                            <button
                                                key={b}
                                                onClick={() => { setSelectedBranch(b); setBranchOpen(false); }}
                                                style={{
                                                    width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center',
                                                    gap: '0.6rem', background: selectedBranch === b ? 'rgba(0,102,255,0.15)' : 'transparent',
                                                    border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: selectedBranch === b ? '#38bdf8' : '#94a3b8',
                                                    fontWeight: selectedBranch === b ? 700 : 500, textAlign: 'left',
                                                    borderLeft: selectedBranch === b ? `3px solid ${bColor}` : '3px solid transparent',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {b}
                                                {selectedBranch === b && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#38bdf8' }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px', padding: '0.6rem 0.85rem'
                        }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: '0.62rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Branch</p>
                                <p style={{ fontSize: '0.84rem', fontWeight: 700, color: branchColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {selectedBranch}
                                </p>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Restricted
                            </span>
                        </div>
                    )}
                </div>

                {/* Categorized Desktop Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    {navGroups.map(group => {
                        const filteredItems = group.items.filter(item => isModuleAllowed(item.key));
                        if (filteredItems.length === 0) return null;

                        const isCollapsed = collapsedGroups[group.id];

                        return (
                            <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {/* Group Title / Header */}
                                {group.title !== 'MAIN' && (
                                    <div
                                        onClick={() => toggleGroup(group.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.35rem 0.5rem',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            {group.title}
                                        </span>
                                        <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                            {isCollapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                                        </span>
                                    </div>
                                )}

                                {!isCollapsed && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        {filteredItems.map(item => {
                                            const isActive = isItemActive(item.path);

                                            return (
                                                <a
                                                    key={item.label + item.path}
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); router.push(item.path); }}
                                                    style={{
                                                        padding: '0.55rem 0.75rem',
                                                        borderRadius: '8px',
                                                        color: isActive ? '#ffffff' : '#94a3b8',
                                                        background: isActive ? 'rgba(0, 102, 255, 0.16)' : 'transparent',
                                                        borderLeft: isActive ? '4px solid #0066ff' : '4px solid transparent',
                                                        fontWeight: isActive ? 700 : 500,
                                                        transition: 'all 0.15s ease',
                                                        textDecoration: 'none',
                                                        fontSize: '0.85rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.65rem'
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!isActive) {
                                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                                                            (e.currentTarget as HTMLElement).style.color = '#ffffff';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (!isActive) {
                                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                            (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                                                        }
                                                    }}
                                                >
                                                    <span style={{ color: isActive ? '#38bdf8' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                                        {item.icon}
                                                    </span>
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.label}
                                                    </span>
                                                    {item.path === '/notifications' && alertCount > 0 && (
                                                        <span style={{
                                                            marginLeft: 'auto',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '10px',
                                                            lineHeight: 1
                                                        }}>
                                                            {alertCount}
                                                        </span>
                                                    )}
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Area & Operational Shift Card */}
                {user && (
                    <div style={{
                        marginTop: 'auto',
                        padding: '0.9rem',
                        background: 'rgba(255,255,255,0.025)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        {/* Profile Info Summary */}
                        <div
                            onClick={() => setShowSecurityModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', padding: '0.2rem', borderRadius: '6px', transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="Click to manage profile and security settings"
                        >
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '1rem', color: 'white', flexShrink: 0
                            }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: '0.84rem', fontWeight: 800, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.name}
                                </p>
                                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.1rem 0 0 0' }}>
                                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{user.role}</span> • {selectedBranch}
                                </p>
                            </div>
                        </div>

                        {/* Operational Active Shift Card */}
                        {activeShift && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px',
                                padding: '0.6rem 0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                                        <span style={{
                                            width: '7px', height: '7px', borderRadius: '50%',
                                            background: '#10b981', display: 'inline-block',
                                            boxShadow: '0 0 6px #10b981'
                                        }} />
                                        <span style={{ fontWeight: 800, color: '#10b981', letterSpacing: '0.02em' }}>Shift Active</span>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                                        {elapsed || 'Active'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setShowEndShiftModal(true)}
                                    style={{
                                        marginTop: '0.2rem',
                                        width: '100%',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        borderRadius: '6px',
                                        padding: '0.35rem 0',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                                >
                                    End Work Shift
                                </button>
                            </div>
                        )}

                        {/* Security Profile Link */}
                        <button
                            onClick={() => setShowSecurityModal(true)}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                borderRadius: '8px',
                                padding: '0.45rem 0',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        >
                            <IconShield size={14} /> Profile & 2FA Security
                        </button>

                        {/* System Controls */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {/* PWA Install Button */}
                            {isInstallable && (
                                <button
                                    onClick={installPWA}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '8px',
                                        padding: '0.45rem 0',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        boxShadow: '0 4px 12px rgba(0,102,255,0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    Install GariSphere App
                                </button>
                            )}

                            {/* Database Status Indicator */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                padding: '0.3rem 0',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: isLive ? '#10b981' : '#ef4444',
                            }}>
                                <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isLive ? '#10b981' : '#ef4444',
                                    boxShadow: `0 0 6px ${isLive ? '#10b981' : '#ef4444'}`
                                }} />
                                {isLive ? 'Database Connected' : 'Database Offline (Local)'}
                            </div>

                            {/* Sign Out Button */}
                            <button
                                onClick={logout}
                                style={{
                                    width: '100%',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    borderRadius: '8px',
                                    padding: '0.45rem 0',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                            >
                                <IconSignOut size={14} /> Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Shift Confirmation Modal */}
            {showEndShiftModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)',
                    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 2000
                }}>
                    <div className="glass-panel" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#ef4444', margin: 0, fontWeight: 800 }}>
                            End Work Shift?
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                            You have been active for <strong style={{ color: 'white' }}>{elapsed || 'your session'}</strong>. Are you sure you want to end your current operational shift?
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                className="btn-outline"
                                style={{ flex: 1, padding: '0.65rem' }}
                                onClick={() => setShowEndShiftModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444', color: 'white', fontWeight: 800, padding: '0.65rem' }}
                                onClick={() => {
                                    setShowEndShiftModal(false);
                                    endWorkShift();
                                }}
                            >
                                End Shift
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                    }}>
                        <button 
                            onClick={() => { setShowSecurityModal(false); setMfaStep('none'); setMfaError(null); }}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
                        >✕</button>

                        <header style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Profile & Security
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Configure login verification security settings</p>
                        </header>

                        {/* Profile Info Summary */}
                        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #0066ff, #0052cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', flexShrink: 0 }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>{user.name}</div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user.email}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                                    <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', color: '#38bdf8' }}>Role: {user.role}</span>
                                    <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{user.branch}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2-Step Authentication Content Block */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
                                2-Step Authentication (2FA)
                            </h4>

                            {mfaStep === 'none' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                                        Protect your GariSphere account with an extra verification step using an Authenticator app (like Google Authenticator).
                                    </p>

                                    {isMfaEnabled(user.email) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.88rem', fontWeight: 600, background: 'rgba(16,185,129,0.08)', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                Active (Protects login sessions)
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('Are you sure you want to deactivate 2-Step Authentication?')) {
                                                        await disableMfa();
                                                        alert('Two-factor authentication disabled.');
                                                    }
                                                }}
                                                className="btn-outline" 
                                                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', width: '100%' }}
                                            >
                                                Deactivate 2FA
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setMfaStep('intro')} className="btn-primary" style={{ width: '100%' }}>
                                            Configure 2-Step Verification
                                        </button>
                                    )}
                                </div>
                            )}

                            {mfaStep === 'intro' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                                        To set up 2-step verification, you will need a TOTP authenticator app on your smartphone (Google Authenticator, Microsoft Authenticator, or Authy).
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => { setMfaSecret(generateRandomSecret()); setQrError(false); setMfaStep('qr'); }} className="btn-primary" style={{ flex: 1 }}>Get Started</button>
                                        <button onClick={() => setMfaStep('none')} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {mfaStep === 'qr' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                                        Scan this QR code with your authenticator app:
                                    </p>
                                    
                                    {qrError ? (
                                        <div style={{
                                            width: '150px',
                                            height: '150px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            border: '1px dashed #ef4444',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            color: '#fca5a5',
                                            fontSize: '0.78rem',
                                            lineHeight: 1.4,
                                            boxSizing: 'border-box'
                                        }}>
                                            Offline Mode<br/>
                                            Setup manually
                                        </div>
                                    ) : (
                                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`otpauth://totp/GariSphere:${user.email}?secret=${mfaSecret}&issuer=GariSphere`)}`} 
                                                alt="Scan setup QR code"
                                                onError={() => setQrError(true)}
                                                style={{ display: 'block', width: '150px', height: '150px' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ width: '100%' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Or enter this code manually:</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px', fontSize: '0.9rem', color: '#38bdf8' }}>{mfaSecret}</span>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(mfaSecret); setMfaCopied(true); setTimeout(() => setMfaCopied(false), 2000); }}
                                                style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
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
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                                        Enter the 6-digit verification code generated by your app:
                                    </p>

                                    {mfaError && (
                                        <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                                            {mfaError}
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
                                        <h4 style={{ color: 'var(--text-main)', margin: '0.5rem 0 0 0', fontWeight: 800 }}>MFA Enabled Successfully</h4>
                                    </div>
                                    
                                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                                        Store these recovery backup codes safely. They can be used to log in if you ever lose access to your authenticator device:
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'center' }}>
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
                                        {mfaCopied ? 'Copied to Clipboard' : 'Copy Backup Codes'}
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

            <MobileBottomNav />
        </>
    );
}

export default function Sidebar() {
    return (
        <React.Suspense fallback={null}>
            <SidebarInner />
        </React.Suspense>
    );
}
