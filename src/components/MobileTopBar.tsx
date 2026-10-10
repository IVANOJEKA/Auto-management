'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useBranches } from '../context/BranchContext';

export default function MobileTopBar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { selectedBranch, setSelectedBranch, shipments, invoices, complianceRecords, repairOrders } = useData();
    const { branches } = useBranches();
    const [branchModalOpen, setBranchModalOpen] = useState(false);

    if (!user) return null;

    // Get current page title based on pathname
    const getPageTitle = (path: string) => {
        switch (path) {
            case '/dashboard': return 'Dashboard';
            case '/inventory': return 'Vehicles';
            case '/crm': return 'Customers';
            case '/sales': return 'Sales Deals';
            case '/finance': return 'Finance & Invoices';
            case '/service': return 'Workshop';
            case '/parts': return 'Parts POS';
            case '/logistics': return 'Logistics';
            case '/compliance': return 'Compliance & Logbooks';
            case '/reports': return 'Reports';
            case '/admin/audit-trail': return 'Audit Trail';
            case '/settings': return 'Settings';
            case '/notifications': return 'Notifications';
            default: return 'GariSphere';
        }
    };

    const isHome = pathname === '/dashboard' || pathname === '/app';
    const isGlobal = user.role === 'Admin';
    const allBranchesList = ['All', ...branches];

    // Notification alert calculation
    const today = new Date();
    let alertCount = 0;
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

    return (
        <>
            <header
                className="gs-mobile-topbar"
                style={{
                    display: 'none', // Shown via CSS media query @media (max-width: 768px)
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    height: '56px',
                    background: 'rgba(9, 13, 22, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0 1rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    paddingTop: 'env(safe-area-inset-top, 0px)'
                }}
            >
                {/* Left side: Back Button or Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    {!isHome ? (
                        <button
                            onClick={() => router.back()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            ←
                        </button>
                    ) : (
                        <div
                            onClick={() => router.push('/dashboard')}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                                padding: '4px'
                            }}
                        >
                            <img src="/garisphere-logo.png" alt="GariSphere" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
                            {getPageTitle(pathname)}
                        </h1>
                        <button
                            onClick={() => isGlobal && setBranchModalOpen(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontSize: '0.7rem',
                                color: selectedBranch === 'All' ? 'var(--secondary-accent)' : '#0066ff',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                cursor: isGlobal ? 'pointer' : 'default',
                                margin: 0
                            }}
                        >
                            <span>{selectedBranch === 'All' ? '🌐 All Branches' : `🏪 ${selectedBranch}`}</span>
                            {isGlobal && <span style={{ fontSize: '0.55rem' }}>▼</span>}
                        </button>
                    </div>
                </div>

                {/* Right side: Notifications & Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <button
                        onClick={() => router.push('/notifications')}
                        style={{
                            position: 'relative',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        🔔
                        {alertCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-3px',
                                right: '-3px',
                                background: '#ef4444',
                                color: 'white',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #090d16'
                            }}>
                                {alertCount > 9 ? '9+' : alertCount}
                            </span>
                        )}
                    </button>

                    <div
                        onClick={() => router.push('/settings')}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            border: '2px solid rgba(255, 255, 255, 0.15)'
                        }}
                    >
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            {/* Mobile Branch Selector Bottom Sheet Modal */}
            {branchModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(2, 6, 23, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center'
                    }}
                    onClick={() => setBranchModalOpen(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            background: '#0c1630',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            maxHeight: '70vh',
                            overflowY: 'auto',
                            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'white', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                                Select Dealership Branch
                            </h3>
                            <button
                                onClick={() => setBranchModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {allBranchesList.map(b => (
                                <button
                                    key={b}
                                    onClick={() => { setSelectedBranch(b); setBranchModalOpen(false); }}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '12px',
                                        background: selectedBranch === b ? 'rgba(0, 102, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${selectedBranch === b ? '#0066ff' : 'rgba(255, 255, 255, 0.08)'}`,
                                        color: selectedBranch === b ? '#38bdf8' : 'white',
                                        fontWeight: selectedBranch === b ? 700 : 500,
                                        fontSize: '0.92rem',
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>{b === 'All' ? '🌐 All Branches' : `🏪 ${b}`}</span>
                                    {selectedBranch === b && <span style={{ color: '#0066ff', fontWeight: 800 }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
