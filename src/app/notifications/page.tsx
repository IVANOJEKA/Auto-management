'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, TeamNotice } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';
import { usePageGuard } from '../../hooks/usePageGuard';

interface ActivityEvent {
    id: string;
    type: 'Sales' | 'CRM' | 'Service' | 'Logistics' | 'Finance' | 'Inventory';
    title: string;
    description: string;
    timestamp: string;
    icon: string;
}

export default function NotificationsPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('notifications');
    const { vehicles, leads, clients, deals, invoices, repairOrders, shipments, complianceRecords, selectedBranch, notices, addNotice, deleteNotice } = useData();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'Activity' | 'Notices' | 'Urgent'>('Activity');
    const [noticeText, setNoticeText] = useState('');
    const [noticePriority, setNoticePriority] = useState<TeamNotice['priority']>('Info');
    const [activityFilter, setActivityFilter] = useState<'All' | ActivityEvent['type']>('All');

    // Route guard
    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAllowed || !isAuthenticated || !user) return null;

    // ─── Chronological System Activity Events Generation ──────────────────────
    const derivedActivities: ActivityEvent[] = [];

    // 1. Deals Activities
    deals.forEach(d => {
        derivedActivities.push({
            id: `act-deal-${d.id}`,
            type: 'Sales',
            title: d.status === 'Closed' ? 'Deal Closed' : 'Financing Pending',
            description: `Agent ${d.agent || 'Staff'} completed a deal for ${d.vehicle} with client ${d.client} (Sale: ${d.salePrice}).`,
            timestamp: d.date === 'Today' ? 'Today, showroom hours' : d.date === 'Yesterday' ? 'Yesterday' : `${d.date}`,
            icon: 'S'
        });
    });

    // 2. Invoices Activities
    invoices.forEach(inv => {
        derivedActivities.push({
            id: `act-inv-${inv.id}`,
            type: 'Finance',
            title: inv.status === 'Paid' ? 'Invoice Paid' : inv.status === 'Overdue' ? 'Invoice Overdue' : 'Invoice Logged',
            description: `Invoice ${inv.id} for client ${inv.client} of ${inv.amount} (${inv.type}) is currently ${inv.status}.`,
            timestamp: inv.date === 'Today' ? 'Today' : inv.date === 'Yesterday' ? 'Yesterday' : `${inv.date}`,
            icon: 'F'
        });
    });

    // 3. Repair Orders Activities
    repairOrders.forEach(ro => {
        derivedActivities.push({
            id: `act-ro-${ro.ro}`,
            type: 'Service',
            title: ro.status === 'Completed' ? 'Repair Order Completed' : 'e-RO Opened',
            description: `Technician ${ro.technician || 'Staff'} set Repair Order ${ro.ro} (${ro.vehicle}) status to ${ro.status}.`,
            timestamp: 'Recent days',
            icon: 'W'
        });
    });

    // 4. Shipments Activities
    shipments.forEach(s => {
        derivedActivities.push({
            id: `act-ship-${s.id}`,
            type: 'Logistics',
            title: `Shipment ${s.status}`,
            description: `Shipment ORD-${s.orderId || s.id} for ${s.vehicle} from ${s.from} is ${s.status}. ETA: ${s.eta}.`,
            timestamp: 'Recent status update',
            icon: 'L'
        });
    });

    // 5. Vehicles Local Acquisitions
    vehicles.forEach(v => {
        if (v.source && v.source !== 'Shipped') {
            derivedActivities.push({
                id: `act-veh-${v.id}`,
                type: 'Inventory',
                title: v.source === 'Swap Trade-in' ? 'Trade-in Swap Acquired' : 'Local Vehicle Acquired',
                description: `Acquired a ${v.year} ${v.make} ${v.model} from ${v.acquisitionDetails?.sellerName || 'Private Seller'} (Agreed: ${v.price}).`,
                timestamp: v.acquisitionDetails?.acquisitionDate || 'Recently',
                icon: 'V'
            });
        }
    });

    // 6. Leads Activities
    leads.forEach(l => {
        derivedActivities.push({
            id: `act-lead-${l.id}`,
            type: 'CRM',
            title: `New Lead Captured`,
            description: `Lead for ${l.name} registered interest in ${l.interest || 'Unspecified'} (Assigned to ${l.branch || 'Default'}).`,
            timestamp: l.lastContact || 'Just now',
            icon: 'C'
        });
    });

    // Sort derived activities (mock sorting, since we have partial timestamps we just map them)
    const sortedActivities = derivedActivities.filter(a => activityFilter === 'All' || a.type === activityFilter);

    // ─── Urgent Action Alerts Generation ──────────────────────────────────────
    const alerts: { id: string; title: string; desc: string; badge: string; icon: string; link: string }[] = [];
    const today = new Date();

    // 1. Expected Arrivals (within 7 days)
    shipments.forEach(s => {
        if (s.status === 'At Sea' || s.status === 'Port Clearance') {
            const etaDate = new Date(s.eta);
            const diffDays = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
                alerts.push({
                    id: `alert-eta-${s.id}`,
                    title: 'Expected Stock Arrival',
                    desc: `${s.vehicle} arriving in ${diffDays} days (${s.eta})`,
                    badge: 'info',
                    icon: 'L',
                    link: '/logistics'
                });
            }
        }
    });

    // 2. Debts / Overdue Invoices
    invoices.forEach(inv => {
        if (inv.status === 'Overdue') {
            const invDate = new Date(inv.date);
            const diffDays = isNaN(invDate.getTime()) ? 5 : Math.ceil((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
            alerts.push({
                id: `alert-debt-${inv.id}`,
                title: 'Overdue Invoice Debt',
                desc: `${inv.client} payment of ${inv.amount} is ${diffDays} days overdue!`,
                badge: 'danger',
                icon: 'F',
                link: '/finance'
            });
        }
    });

    // 3. E-signs Pending
    complianceRecords.forEach(c => {
        if (c.esign === 'Pending') {
            alerts.push({
                id: `alert-esign-${c.id}`,
                title: 'Compliance E-Sign Pending',
                desc: `Client ${c.client} for vehicle ${c.vehicle} needs contract signature.`,
                badge: 'warning',
                icon: 'C',
                link: '/compliance'
            });
        }
    });

    // 4. Incomplete Repair Orders
    const activeROs = repairOrders.filter(r => r.status !== 'Completed');
    if (activeROs.length > 0) {
        alerts.push({
            id: `alert-ro-active`,
            title: `${activeROs.length} Active Repair Orders`,
            desc: `Vehicles awaiting parts or in technician bays. Next due: ${activeROs[0]?.due || 'Today'}.`,
            badge: 'info',
            icon: 'W',
            link: '/service'
        });
    }

    // ─── Team Notice Actions ──────────────────────────────────────────────────
    const handlePostNotice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noticeText.trim()) return;

        addNotice({
            text: noticeText,
            priority: noticePriority,
            author: user.name,
            branch: user.branch as any
        });

        setNoticeText('');
        setNoticePriority('Info');
    };

    const handleDeleteNotice = (id: string) => {
        deleteNotice(id);
    };

    const priorityColors: Record<TeamNotice['priority'], string> = {
        Info: 'var(--primary)',
        Warning: 'var(--warning)',
        Urgent: 'var(--danger)'
    };

    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>
                
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Notifications & Feed</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>System audit trail, internal communications, and urgent tasks</p>
                    </div>
                </header>

                {/* KPI stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>System Events Derived</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--secondary-accent)' }}>{derivedActivities.length}</h3>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Staff Communications Board</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--success)' }}>{notices.length}</h3>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Critical System Alerts</p>
                        <h3 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--danger)' }}>{alerts.length}</h3>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)' }}>
                    {[
                        { key: 'Activity', label: 'System Activity Log', count: sortedActivities.length },
                        { key: 'Notices', label: 'Staff Message Board', count: notices.length },
                        { key: 'Urgent', label: 'Urgent Action Center', count: alerts.length }
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key as any)}
                            style={{
                                padding: '0.65rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                                color: activeTab === t.key ? 'white' : 'var(--text-muted)', fontWeight: activeTab === t.key ? 700 : 400, fontSize: '0.9rem',
                                borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {t.label}
                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '10px', color: activeTab === t.key ? 'white' : 'var(--text-muted)' }}>
                                {t.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ─── TAB 1: SYSTEM ACTIVITY LOG ─── */}
                {activeTab === 'Activity' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>System Events Feed</h3>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                {(['All', 'Sales', 'CRM', 'Service', 'Logistics', 'Finance', 'Inventory'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActivityFilter(cat)}
                                        style={{
                                            padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', cursor: 'pointer',
                                            border: `1px solid ${activityFilter === cat ? 'var(--primary)' : 'var(--border-color)'}`,
                                            background: activityFilter === cat ? 'rgba(99,102,241,0.2)' : 'transparent',
                                            color: activityFilter === cat ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {sortedActivities.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No activity records matching this category filter.</p>
                            )}
                            {sortedActivities.map(act => (
                                <div
                                    key={act.id}
                                    style={{
                                        display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem',
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,102,255,0.08)',
                                        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                                    }}>
                                        {act.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{act.title}</h4>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{act.timestamp}</span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{act.description}</p>
                                    </div>
                                    <span className="badge" style={{ fontSize: '0.62rem', opacity: 0.85 }}>{act.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── TAB 2: STAFF MESSAGE BOARD ─── */}
                {activeTab === 'Notices' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
                        {/* Notice Publisher */}
                        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', marginTop: 0 }}>Post Showroom Notice</h3>
                            <form onSubmit={handlePostNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Priority Level</label>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {(['Info', 'Warning', 'Urgent'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNoticePriority(p)}
                                                style={{
                                                    flex: 1, padding: '0.4rem 0', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', cursor: 'pointer',
                                                    border: `1.5px solid ${noticePriority === p ? priorityColors[p] : 'var(--border-color)'}`,
                                                    background: noticePriority === p ? `${priorityColors[p]}15` : 'transparent',
                                                    color: noticePriority === p ? priorityColors[p] : 'var(--text-muted)', transition: 'all 0.15s', fontWeight: noticePriority === p ? 700 : 400
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Message / Announcement</label>
                                    <textarea
                                        required
                                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' } as any}
                                        value={noticeText}
                                        onChange={e => setNoticeText(e.target.value)}
                                        placeholder="e.g. Jinja Showroom: detailer staff is fully booked today, route all viewings to Entebbe Hub."
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '0.25rem' }}>
                                    Post Update
                                </button>
                            </form>
                        </div>

                        {/* Notice Board */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1.25rem' }}>Active Showroom Bulletin</h3>
                            {notices.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>No announcements on the board.</p>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {notices.map(note => (
                                    <div
                                        key={note.id}
                                        style={{
                                            padding: '1.25rem', borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-card)', border: `1.5px solid ${priorityColors[note.priority]}33`,
                                            display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: priorityColors[note.priority], fontWeight: 700 }}>
                                                {note.priority} NOTICE
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{note.timestamp}</span>
                                                <button
                                                    onClick={() => handleDeleteNotice(note.id)}
                                                    style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.45, fontWeight: 500 }}>{note.text}</p>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                                                {note.author.charAt(0)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>{note.author}</p>
                                                <p style={{ fontSize: '0.62rem', color: 'var(--secondary-accent)', margin: 0 }}>{note.branch}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TAB 3: URGENT ACTION CENTER ─── */}
                {activeTab === 'Urgent' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--danger)' }}>Actions Requiring Showroom Attention</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {alerts.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                    <p style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: 'var(--success)' }}>✓</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showrooms are running clean! No pending urgent alerts.</p>
                                </div>
                            )}
                            {alerts.map(al => (
                                <div
                                    key={al.id}
                                    style={{
                                        display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem',
                                        background: al.badge === 'danger' ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)',
                                        border: `1px solid ${al.badge === 'danger' ? 'rgba(239,68,68,0.25)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>{al.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.15rem 0', color: 'var(--text-main)' }}>{al.title}</h4>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{al.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(al.link)}
                                        style={{
                                            padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                                            background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.color = 'var(--primary)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.color = 'var(--text-main)';
                                        }}
                                    >
                                        Go to Module →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

const DEFAULT_NOTICES: TeamNotice[] = [
    {
        id: '1',
        text: 'Lexus LX 600 custom order arriving at Port Clearance on Monday. Entebbe team, prepare vehicle logs.',
        priority: 'Warning',
        author: 'Alex T.',
        branch: 'Kampala Main',
        timestamp: '10:15 AM, Today'
    },
    {
        id: '2',
        text: 'Reminder: Check client KYC verification status before printing any final Vehicle Sales Agreement.',
        priority: 'Urgent',
        author: 'Sarah M.',
        branch: 'Jinja Showroom',
        timestamp: 'Yesterday'
    }
];
