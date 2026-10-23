'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { usePageGuard } from '../../hooks/usePageGuard';
import { useData } from '../../context/DataContext';
import { useCurrency } from '../../context/CurrencyContext';
import Sidebar from '../../components/Sidebar';
import '../globals.css';

type DateRange = 'Today' | 'This Week' | 'This Month' | 'All Time';
type ReportTab = 'Sales' | 'Inventory' | 'Leads' | 'Service' | 'Finance' | 'Shifts';

function isInRange(dateStr: string, range: DateRange): boolean {
    if (range === 'All Time') return true;
    const now = new Date();
    const d = new Date(dateStr === 'Today' ? now : dateStr === 'Yesterday' ? new Date(now.getTime() - 86400000) : dateStr);
    if (isNaN(d.getTime())) return range === 'Today';
    const start = new Date(now);
    if (range === 'Today') { start.setHours(0,0,0,0); }
    else if (range === 'This Week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); }
    else if (range === 'This Month') { start.setDate(1); start.setHours(0,0,0,0); }
    return d >= start;
}

export default function ReportsPage() {
    const { user, isAuthenticated } = useAuth();
    const { isAllowed } = usePageGuard('reports');
    const { vehicles, leads, clients, deals, invoices, repairOrders, selectedBranch, exportToCSV, workShifts } = useData();
    const { formatCurrency: fmt, parseToLocal } = useCurrency();
    const getNum = (val: any) => parseToLocal(val);
    const router = useRouter();
    const [range, setRange] = useState<DateRange>('This Month');
    const [tab, setTab] = useState<ReportTab>('Sales');

    useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);
    if (!isAuthenticated || !user || !isAllowed) return null;

    // Branch-filtered base data
    const bVehicles = vehicles.filter(v => selectedBranch === 'All' || v.branch === selectedBranch);
    const bDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const bLeads = leads.filter(l => selectedBranch === 'All' || l.branch === selectedBranch);
    const bClients = clients.filter(c => selectedBranch === 'All' || c.branch === selectedBranch);
    const bInvoices = invoices.filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
    const bROs = repairOrders.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);

    // Range-filtered
    const rDeals = bDeals.filter(d => isInRange(d.date || '', range));
    const rInvoices = bInvoices.filter(i => isInRange(i.date || '', range));
    const rLeads = bLeads.filter(l => isInRange(l.lastContact || '', range));

    const closedDeals = rDeals.filter(d => d.status === 'Closed');
    const paidInvoices = rInvoices.filter(i => i.status === 'Paid');
    const totalRevenue = paidInvoices.reduce((s, i) => s + parseToLocal(i.amount), 0);
    const totalMargin = closedDeals.reduce((s, d) => s + parseToLocal(d.margin), 0);

    // Agent leaderboard
    const agentMap: Record<string, { deals: number; commission: number; revenue: number }> = {};
    closedDeals.forEach(d => {
        if (!agentMap[d.agent]) agentMap[d.agent] = { deals: 0, commission: 0, revenue: 0 };
        agentMap[d.agent].deals++;
        agentMap[d.agent].commission += getNum(d.commission);
        agentMap[d.agent].revenue += getNum(d.salePrice);
    });
    const agentLeaderboard = Object.entries(agentMap).sort((a, b) => b[1].deals - a[1].deals);
    const topAgent = agentLeaderboard[0]?.[0] || '—';

    // Branch performance
    const branchNames = ['Kampala Main', 'Jinja Showroom', 'Entebbe Hub'];
    const branchPerf = branchNames.map(b => {
        const bD = closedDeals.filter(d => d.branch === b);
        const bRev = bD.reduce((s, d) => s + getNum(d.salePrice), 0);
        return { branch: b, deals: bD.length, revenue: bRev };
    }).filter(b => b.deals > 0 || selectedBranch === 'All');
    const totalBranchRev = branchPerf.reduce((s, b) => s + b.revenue, 0);

    // Inventory aging (simulate days using stable vin/id hash value)
    const agingVehicles = bVehicles.map((v, i) => {
        const hash = v.vin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return { ...v, days: (i + 1) * 8 + (hash % 15) };
    });

    // Leads
    const hotLeads = bLeads.filter(l => l.status === 'Hot').length;
    const coldLeads = bLeads.filter(l => l.status === 'Cold').length;
    const followUpLeads = bLeads.filter(l => l.status === 'Follow-up').length;
    const convertedClients = bClients.filter(c => c.purchases > 0).length;
    const convRate = bClients.length > 0 ? ((convertedClients / bClients.length) * 100).toFixed(1) : '0.0';
    const kycPending = bClients.filter(c => c.kyc === 'Pending');

    // Service
    const activeROs = bROs.filter(r => r.status !== 'Completed');
    const completedROs = bROs.filter(r => r.status === 'Completed');
    const avgLabor = bROs.length > 0 ? (bROs.reduce((s, r) => s + (r.laborHours || 0), 0) / bROs.length).toFixed(1) : '0';
    const techMap: Record<string, { count: number; cost: number }> = {};
    bROs.forEach(r => {
        if (!techMap[r.technician]) techMap[r.technician] = { count: 0, cost: 0 };
        techMap[r.technician].count++;
        techMap[r.technician].cost += getNum(r.cost || '0');
    });

    // Finance
    const totalInvoiced = bInvoices.reduce((s, i) => s + getNum(i.amount), 0);
    const totalCollected = bInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + getNum(i.amount), 0);
    const totalOutstanding = bInvoices.filter(i => i.status === 'Pending Finance').reduce((s, i) => s + getNum(i.amount), 0);
    const totalOverdue = bInvoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + getNum(i.amount), 0);

    // AR Aging buckets
    const now = new Date();
    const arBuckets = { '0-30': { count: 0, amt: 0 }, '31-60': { count: 0, amt: 0 }, '61-90': { count: 0, amt: 0 }, '90+': { count: 0, amt: 0 } };
    bInvoices.filter(i => i.status !== 'Paid').forEach(i => {
        const d = new Date(i.date === 'Today' ? now : i.date === 'Yesterday' ? new Date(now.getTime() - 86400000) : i.date);
        const days = isNaN(d.getTime()) ? 0 : Math.floor((now.getTime() - d.getTime()) / 86400000);
        const amt = getNum(i.amount);
        if (days <= 30) { arBuckets['0-30'].count++; arBuckets['0-30'].amt += amt; }
        else if (days <= 60) { arBuckets['31-60'].count++; arBuckets['31-60'].amt += amt; }
        else if (days <= 90) { arBuckets['61-90'].count++; arBuckets['61-90'].amt += amt; }
        else { arBuckets['90+'].count++; arBuckets['90+'].amt += amt; }
    });

    // Payment methods breakdown
    const methodMap: Record<string, { count: number; amt: number }> = {};
    bInvoices.filter(i => i.status === 'Paid' && i.paymentMethod).forEach(i => {
        const m = i.paymentMethod!;
        if (!methodMap[m]) methodMap[m] = { count: 0, amt: 0 };
        methodMap[m].count++;
        methodMap[m].amt += getNum(i.amount);
    });

    // Top debtors
    const debtorMap: Record<string, number> = {};
    bInvoices.filter(i => i.status !== 'Paid').forEach(i => {
        debtorMap[i.client] = (debtorMap[i.client] || 0) + getNum(i.amount);
    });
    const topDebtors = Object.entries(debtorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // ─── Shift Calculations ──────────────────────────────────────────────────
    const bShifts = (workShifts || []).filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
    const filteredShifts = bShifts.filter(s => isInRange(s.startTime || '', range));

    const calculateShiftDuration = (s: any) => {
        const start = new Date(s.startTime).getTime();
        if (s.status === 'Active') return 'Active';
        const end = s.endTime ? new Date(s.endTime).getTime() : start;
        if (isNaN(start)) return '—';
        const diffMs = end - start;
        if (diffMs < 0) return '0m';
        const diffMins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    const formatTotalDuration = (shifts: any[]) => {
        let totalMs = 0;
        shifts.forEach(s => {
            if (s.endTime) {
                const start = new Date(s.startTime).getTime();
                const end = new Date(s.endTime).getTime();
                if (!isNaN(start) && !isNaN(end)) {
                    totalMs += (end - start);
                }
            }
        });
        const totalHrs = Math.floor(totalMs / 3600000);
        const totalMins = Math.floor((totalMs % 3600000) / 60000);
        return `${totalHrs}h ${totalMins}m`;
    };

    const calculateAverageDuration = (shifts: any[]) => {
        const ended = shifts.filter(s => s.endTime);
        if (ended.length === 0) return '—';
        let totalMs = 0;
        ended.forEach(s => {
            const start = new Date(s.startTime).getTime();
            const end = new Date(s.endTime).getTime();
            if (!isNaN(start) && !isNaN(end)) {
                totalMs += (end - start);
            }
        });
        const avgMs = totalMs / ended.length;
        const avgMins = Math.floor(avgMs / 60000);
        const hrs = Math.floor(avgMins / 60);
        const mins = avgMins % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    const exportShiftsToCSV = () => {
        const data = filteredShifts.map(s => {
            const durationText = calculateShiftDuration(s);
            return {
                Employee: s.userName,
                Email: s.userEmail,
                Branch: s.branch,
                'Clock In': s.startTime ? new Date(s.startTime).toLocaleString() : '—',
                'Clock Out': s.endTime ? new Date(s.endTime).toLocaleString() : 'Active',
                Duration: durationText,
                Status: s.status
            };
        });
        exportToCSV(data, 'work_shifts_timesheet.csv');
    };

    const tabs: ReportTab[] = ['Sales', 'Inventory', 'Leads', 'Service', 'Finance', 'Shifts'];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Reports & Analytics</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Performance insights across all dealership operations</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.3rem' }}>
                        {(['Today', 'This Week', 'This Month', 'All Time'] as DateRange[]).map(r => (
                            <button key={r} onClick={() => setRange(r)} style={{
                                padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: range === r ? 700 : 400,
                                background: range === r ? 'var(--primary)' : 'transparent', color: range === r ? 'white' : 'var(--text-muted)', transition: 'all 0.15s'
                            }}>{r}</button>
                        ))}
                    </div>
                </header>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
                    {tabs.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '0.65rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                            color: tab === t ? 'white' : 'var(--text-muted)', fontWeight: tab === t ? 700 : 400, fontSize: '0.9rem',
                            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s'
                        }}>{t}</button>
                    ))}
                </div>

                {/* ─── SALES TAB ─── */}
                {tab === 'Sales' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total Revenue" value={fmt(totalRevenue)} color="var(--success)" />
                        <StatCard label="Units Sold" value={`${closedDeals.length}`} />
                        <StatCard label="Gross Margin" value={fmt(totalMargin)} color="var(--secondary-accent)" />
                        <StatCard label="Top Agent" value={topAgent} color="var(--primary)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '1rem' }}>Agent Leaderboard</h3>
                                <button className="btn-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                                    onClick={() => exportToCSV(agentLeaderboard.map(([a, s]) => ({ Agent: a, Deals: s.deals, Commission: fmt(s.commission), Revenue: fmt(s.revenue) })), 'agent_leaderboard.csv')}>
                                    ⬇ Export
                                </button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Rank', 'Agent', 'Deals', 'Commission', 'Revenue'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {agentLeaderboard.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No deals in this period.</td></tr>}
                                    {agentLeaderboard.map(([agent, stats], i) => (
                                        <tr key={agent} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={tdStyle}><span style={{ fontSize: '0.85rem', fontWeight: 700, color: i === 0 ? 'var(--warning)' : 'inherit' }}>#{i+1}</span></td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{agent}</td>
                                            <td style={tdStyle}><span className="badge badge-success">{stats.deals}</span></td>
                                            <td style={{ ...tdStyle, color: 'var(--warning)' }}>{fmt(stats.commission)}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(stats.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1rem' }}>Branch Performance</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Branch', 'Deals', 'Revenue', 'Share'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {branchPerf.length === 0 && <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No data.</td></tr>}
                                    {branchPerf.map(b => (
                                        <tr key={b.branch} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontSize: '0.82rem' }}>{b.branch}</td>
                                            <td style={tdStyle}>{b.deals}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)' }}>{fmt(b.revenue)}</td>
                                            <td style={tdStyle}>{totalBranchRev > 0 ? `${((b.revenue / totalBranchRev) * 100).toFixed(0)}%` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>)}

                {/* ─── INVENTORY TAB ─── */}
                {tab === 'Inventory' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total Units" value={`${bVehicles.length}`} />
                        <StatCard label="In Stock" value={`${bVehicles.filter(v => v.status === 'In Stock').length}`} color="var(--success)" />
                        <StatCard label="In Transit" value={`${bVehicles.filter(v => v.status === 'In Transit').length}`} color="var(--secondary-accent)" />
                        <StatCard label="Sold (All Time)" value={`${bVehicles.filter(v => v.status === 'Sold').length}`} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>Inventory Aging</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>&gt;60 days (warning) · &gt;90 days (critical) — monitor depreciation</p>
                                </div>
                                <button className="btn-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                                    onClick={() => exportToCSV(agingVehicles.map(v => ({ VIN: v.vin, Vehicle: `${v.year} ${v.make} ${v.model}`, Status: v.status, Branch: v.branch || '—', 'Days in Stock': v.days })), 'inventory_aging.csv')}>
                                    ⬇ Export
                                </button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Vehicle', 'VIN / Frame No', 'Status', 'Branch', 'Days in Stock'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {agingVehicles.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles.</td></tr>}
                                    {agingVehicles.map(v => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', background: v.days > 90 ? 'rgba(239,68,68,0.06)' : v.days > 60 ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{v.year} {v.make} {v.model}</td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.vin}</td>
                                            <td style={tdStyle}><span className={`badge ${v.status === 'In Stock' ? 'badge-success' : v.status === 'In Transit' ? 'badge-info' : v.status === 'Reserved' ? 'badge-warning' : 'badge-danger'}`}>{v.status}</span></td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{v.branch || '—'}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: v.days > 90 ? 'var(--danger)' : v.days > 60 ? 'var(--warning)' : 'white' }}>
                                                {v.days} days
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Stock Value</p>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--success)', marginBottom: '0.25rem' }}>{fmt(bVehicles.filter(v => v.status !== 'Sold').reduce((s, v) => s + parseToLocal(v.price), 0))}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retail value of unsold stock</p>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Cost Basis</p>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--warning)', marginBottom: '0.25rem' }}>{fmt(bVehicles.filter(v => v.status !== 'Sold').reduce((s, v) => s + parseToLocal(v.cost), 0))}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Acquisition cost of unsold stock</p>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Slow Movers (&gt;60d)</p>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>{agingVehicles.filter(v => v.days > 60 && v.status !== 'Sold').length}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicles needing attention</p>
                            </div>
                        </div>
                    </div>
                </>)}

                {/* ─── LEADS TAB ─── */}
                {tab === 'Leads' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total Leads" value={`${bLeads.length}`} />
                        <StatCard label="Hot Leads" value={`${hotLeads}`} color="var(--danger)" />
                        <StatCard label="Conversion Rate" value={`${convRate}%`} color="var(--success)" />
                        <StatCard label="KYC Pending" value={`${kycPending.length}`} color="var(--warning)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <h3 style={{ fontSize: '1rem' }}>Lead Status Breakdown</h3>
                            {[{ label: 'Hot', value: hotLeads, color: 'var(--danger)' }, { label: 'Follow-up', value: followUpLeads, color: 'var(--warning)' }, { label: 'Cold', value: coldLeads, color: 'var(--secondary-accent)' }].map(s => (
                                <div key={s.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                                        <span>{s.label}</span><span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: bLeads.length > 0 ? `${(s.value / bLeads.length) * 100}%` : '0%', background: s.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--secondary-accent)' }}>CONVERSION FUNNEL</h4>
                                {[
                                    { label: 'Total Leads', value: bLeads.length },
                                    { label: 'Hot / Active', value: hotLeads },
                                    { label: 'Converted Clients', value: convertedClients },
                                ].map((step, i, arr) => (
                                    <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < arr.length - 1 ? '0.5rem' : '0' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                <span>{step.label}</span><strong>{step.value}</strong>
                                            </div>
                                            {i < arr.length - 1 && <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '4px' }}>
                                                <div style={{ height: '100%', width: arr[0].value > 0 ? `${(step.value / arr[0].value) * 100}%` : '0%', background: 'var(--primary)', borderRadius: '2px' }} />
                                            </div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1rem' }}>KYC Pending Clients</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Client', 'Email', 'Phone', 'Branch'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {kycPending.length === 0 && <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>All clients KYC verified.</td></tr>}
                                    {kycPending.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{c.phone || '—'}</td>
                                            <td style={tdStyle}><span style={{ fontSize: '0.75rem', color: 'var(--secondary-accent)' }}>{c.branch || '—'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>)}

                {/* ─── SERVICE TAB ─── */}
                {tab === 'Service' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total ROs" value={`${bROs.length}`} />
                        <StatCard label="Active ROs" value={`${activeROs.length}`} color="var(--warning)" />
                        <StatCard label="Completed" value={`${completedROs.length}`} color="var(--success)" />
                        <StatCard label="Avg Labor Hrs" value={`${avgLabor}h`} color="var(--secondary-accent)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1rem' }}>All Repair Orders</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['RO #', 'Vehicle', 'Client', 'Technician', 'Status', 'Due', 'Cost'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {bROs.length === 0 && <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No repair orders found.</td></tr>}
                                    {bROs.map(r => (
                                        <tr key={r.ro} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--secondary-accent)' }}>{r.ro}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600, fontSize: '0.85rem' }}>{r.vehicle}</td>
                                            <td style={tdStyle}>{r.client}</td>
                                            <td style={tdStyle}>{r.technician}</td>
                                            <td style={tdStyle}><span className={`badge ${r.status === 'Completed' ? 'badge-success' : r.status === 'Awaiting Parts' ? 'badge-warning' : 'badge-info'}`}>{r.status}</span></td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.due}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{r.cost || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1rem' }}>Technician Performance</h3>
                            </div>
                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {Object.entries(techMap).map(([tech, stats]) => (
                                    <div key={tech} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '0.88rem' }}>{tech}</strong>
                                            <span className="badge badge-info">{stats.count} ROs</span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{fmt(stats.cost)} billed</p>
                                    </div>
                                ))}
                                {Object.keys(techMap).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No data.</p>}
                            </div>
                        </div>
                    </div>
                </>)}

                {/* ─── FINANCE TAB ─── */}
                {tab === 'Finance' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total Invoiced" value={fmt(totalInvoiced)} />
                        <StatCard label="Collected" value={fmt(totalCollected)} color="var(--success)" />
                        <StatCard label="Outstanding" value={fmt(totalOutstanding)} color="var(--warning)" />
                        <StatCard label="Overdue" value={fmt(totalOverdue)} color="var(--danger)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontSize: '1rem' }}>AR Aging Buckets</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['Age Bracket', 'Invoices', 'Total Amount', 'Risk'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {Object.entries(arBuckets).map(([bracket, data]) => (
                                        <tr key={bracket} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{bracket} days</td>
                                            <td style={tdStyle}>{data.count}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(data.amt)}</td>
                                            <td style={tdStyle}><span className={`badge ${bracket === '90+' ? 'badge-danger' : bracket === '61-90' ? 'badge-warning' : 'badge-info'}`}>{bracket === '90+' ? 'Critical' : bracket === '61-90' ? 'High' : bracket === '31-60' ? 'Medium' : 'Low'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Payment Methods</h3>
                                {Object.entries(methodMap).map(([m, s]) => (
                                    <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{m}</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{fmt(s.amt)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.count} transactions</div>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(methodMap).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No paid invoices with payment method recorded.</p>}
                            </div>
                            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '0.95rem' }}>Top Debtors</h3>
                                </div>
                                {topDebtors.length === 0 && <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No outstanding debts.</p>}
                                {topDebtors.map(([name, amt], i) => (
                                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{i + 1}. {name}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.88rem' }}>{fmt(amt)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>)}

                {/* ─── SHIFTS MONITORING TAB ─── */}
                {tab === 'Shifts' && (<>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard label="Total Shifts" value={`${filteredShifts.length}`} />
                        <StatCard label="Active Personnel" value={`${filteredShifts.filter(s => s.status === 'Active').length}`} color="var(--success)" />
                        <StatCard label="Cumulative Working Time" value={formatTotalDuration(filteredShifts)} color="var(--secondary-accent)" />
                        <StatCard label="Average Shift Length" value={calculateAverageDuration(filteredShifts)} color="var(--primary)" />
                    </div>

                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>Live Shifts & Timesheets</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monitor employee attendance, clock-in times, and session durations</p>
                            </div>
                            <button className="btn-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                                onClick={exportShiftsToCSV}>
                                ⬇ Export Timesheets
                            </button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Branch</th>
                                    <th style={thStyle}>Clock In</th>
                                    <th style={thStyle}>Clock Out</th>
                                    <th style={thStyle}>Duration</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredShifts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No shifts found matching the selected branch/date filters.
                                        </td>
                                    </tr>
                                )}
                                {filteredShifts.map(s => {
                                    const clockInDate = new Date(s.startTime);
                                    const clockInTimeStr = isNaN(clockInDate.getTime()) ? '—' : `${clockInDate.toLocaleDateString()} ${clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                    
                                    let clockOutTimeStr = '—';
                                    if (s.endTime) {
                                        const clockOutDate = new Date(s.endTime);
                                        clockOutTimeStr = isNaN(clockOutDate.getTime()) ? '—' : `${clockOutDate.toLocaleDateString()} ${clockOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                    }

                                    return (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{s.userName}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.userEmail}</td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    background: s.branch === 'Kampala Main' ? 'rgba(249, 115, 22, 0.1)' : s.branch === 'Jinja Showroom' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                                                    color: s.branch === 'Kampala Main' ? 'var(--primary)' : s.branch === 'Jinja Showroom' ? '#a78bfa' : '#34d399',
                                                    padding: '0.15rem 0.45rem',
                                                    borderRadius: '50px',
                                                    border: `1px solid ${s.branch === 'Kampala Main' ? 'rgba(249, 115, 22, 0.2)' : s.branch === 'Jinja Showroom' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`
                                                }}>{s.branch}</span>
                                            </td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{clockInTimeStr}</td>
                                            <td style={{ ...tdStyle, fontSize: '0.8rem', color: s.endTime ? 'var(--text-body)' : 'var(--text-muted)' }}>{clockOutTimeStr}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace' }}>{calculateShiftDuration(s)}</td>
                                            <td style={tdStyle}>
                                                <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                                                    {s.status === 'Active' ? 'Active' : 'Ended'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>)}

            </main>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.6rem', margin: 0, color: color || 'white' }}>{value}</h3>
        </div>
    );
}

const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem' };
