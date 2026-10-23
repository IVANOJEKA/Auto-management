'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';

export default function MobileDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { vehicles, leads, deals, invoices, repairOrders, selectedBranch, shipments } = useData();
    const { formatCurrency: fmt, parseToLocal } = useCurrency();

    if (!user) return null;

    const bVehicles = vehicles.filter(v => selectedBranch === 'All' || v.branch === selectedBranch);
    const bLeads = leads.filter(l => selectedBranch === 'All' || l.branch === selectedBranch);
    const bDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const bInvoices = invoices.filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
    const bROs = repairOrders.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);

    const closedDeals = bDeals.filter(d => d.status === 'Closed');
    const unitsSold = closedDeals.length;

    const totalSalesVolume = closedDeals.reduce((acc, d) => acc + parseToLocal(d.salePrice), 0);
    const paidInvoicesVolume = bInvoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + parseToLocal(i.amount), 0);
    const outstandingVolume = bInvoices.filter(i => i.status === 'Pending Finance' || i.status === 'Overdue').reduce((acc, i) => acc + parseToLocal(i.amount), 0);

    const inStockCount = bVehicles.filter(v => v.status === 'In Stock').length;
    const activeROCount = bROs.filter(r => r.status !== 'Completed').length;

    // Time of day greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div
            className="gs-mobile-dashboard"
            style={{
                display: 'none', // Shown via CSS media query @media (max-width: 768px)
                flexDirection: 'column',
                gap: '1.25rem',
                paddingBottom: '2rem'
            }}
        >
            {/* Header Greeting Card */}
            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        {selectedBranch === 'All' ? 'All Branches' : selectedBranch}
                    </p>
                    <span style={{ fontSize: '0.7rem', background: 'var(--border-color)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {user.role}
                    </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                    {greeting}, {user.name.split(' ')[0]}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Here is your dealership overview for today.
                </p>
            </div>

            {/* Today's Compact KPI Cards */}
            <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                    TODAY'S OPERATIONS
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Sales</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {totalSalesVolume === 0 ? '—' : fmt(totalSalesVolume)}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {unitsSold} vehicle{unitsSold !== 1 ? 's' : ''} sold
                        </span>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payments Received</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {paidInvoicesVolume === 0 ? '—' : fmt(paidInvoicesVolume)}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Collected</span>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Available Vehicles</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {inStockCount}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>In yard & ready</span>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Outstanding Debt</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            {outstandingVolume === 0 ? '—' : fmt(outstandingVolume)}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--danger, #ef4444)', fontWeight: 600 }}>Pending invoices</span>
                    </div>
                </div>
            </div>

            {/* Mobile Quick Actions Area */}
            <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                    QUICK ACTIONS
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                    <button
                        onClick={() => router.push('/crm')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: 'var(--secondary-accent)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>+ Customer</span>
                    </button>

                    <button
                        onClick={() => router.push('/inventory')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: 'var(--primary)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>+ Vehicle</span>
                    </button>

                    <button
                        onClick={() => router.push('/sales')}
                        style={{
                            background: 'rgba(0, 102, 255, 0.2)',
                            border: '1px solid #0066ff',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#38bdf8',
                            cursor: 'pointer'
                        }}
                    >
                        <span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>+ New Deal</span>
                    </button>

                    <button
                        onClick={() => router.push('/finance')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: 'var(--success)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>+ Payment</span>
                    </button>

                    <button
                        onClick={() => router.push('/service')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: 'var(--warning)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>+ Workshop</span>
                    </button>

                    <button
                        onClick={() => router.push('/parts')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            padding: '0.85rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: '#a78bfa' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Parts POS</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                        RECENT ACTIVITY
                    </h3>
                    <button onClick={() => router.push('/sales')} style={{ color: '#0066ff', fontSize: '0.75rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                        View All →
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {closedDeals.slice(-3).reverse().map(deal => (
                        <div
                            key={deal.id}
                            className="glass-panel"
                            onClick={() => router.push('/sales')}
                            style={{
                                padding: '0.85rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{deal.vehicle}</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sold to {deal.client}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>{fmt(deal.salePrice)}</span>
                                <span className="badge badge-success" style={{ fontSize: '0.58rem' }}>Closed</span>
                            </div>
                        </div>
                    ))}

                    {closedDeals.length === 0 && (
                        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                            No recent deals recorded today.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
