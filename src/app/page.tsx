'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import Sidebar from '../components/Sidebar';
import { LineChart, DonutChart } from '../components/Charts';
import './globals.css';

export default function DashboardPage() {
    const { user, isAuthenticated, logout } = useAuth();
    const { vehicles, leads, deals, complianceRecords, invoices, repairOrders, shipments, selectedBranch } = useData();
    const { formatCurrency: fmt } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAuthenticated || !user) {
        return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
    }

    // ─── KPI Calculations ────────────────────────────────────────────────────
    const bVehicles = vehicles.filter(v => selectedBranch === 'All' || v.branch === selectedBranch);
    const bLeads = leads.filter(l => selectedBranch === 'All' || l.branch === selectedBranch);
    const bDeals = deals.filter(d => selectedBranch === 'All' || d.branch === selectedBranch);
    const bCompliance = complianceRecords.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);
    const bInvoices = invoices.filter(i => selectedBranch === 'All' || i.branch === selectedBranch);
    const bROs = repairOrders.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);
    const closedDeals = bDeals.filter(d => d.status === 'Closed');
    const rawMargin = closedDeals.reduce((acc, d) => {
        const v = parseFloat((d.margin ?? '0').replace(/[^0-9.-]+/g, ''));
        return isNaN(v) ? acc : acc + v;
    }, 0);
    const grossProfit = 102700 + rawMargin;

    const unitsSold = 45 + closedDeals.length;
    const activeLeadsCount = bLeads.length;

    const serviceRevValue = bInvoices
        .filter(inv => inv.type.toLowerCase().includes('service') && inv.status === 'Paid')
        .reduce((acc, inv) => {
            const v = parseFloat((inv.amount ?? '0').replace(/[^0-9.-]+/g, ''));
            return isNaN(v) ? acc : acc + v;
        }, 31250);



    // ─── Chart Data ──────────────────────────────────────────────────────────
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesTrendData = [85, 92, 78, 115, 130, 108, 142, 125, 155, 170, 148, 182].map((v, i) => ({
        label: monthLabels[i], value: v + (i === 11 ? closedDeals.length * 5 : 0)
    }));
    const leadsTrendData = [40, 55, 48, 62, 70, 58, 75, 65, 80, 90, 78, 95 + activeLeadsCount].map((v, i) => ({
        label: monthLabels[i], value: v
    }));

    // Inventory donut
    const inStock = bVehicles.filter(v => v.status === 'In Stock').length;
    const inTransit = bVehicles.filter(v => v.status === 'In Transit').length;
    const reserved = bVehicles.filter(v => v.status === 'Reserved').length;
    const sold = bVehicles.filter(v => v.status === 'Sold').length;

    // ─── Time-Tracking Alerts & Follow-Ups ────────────────────────────────────
    const bShipments = shipments?.filter(s => selectedBranch === 'All' || s.branch === selectedBranch) || [];
    const alerts: { title: string; unit: string; badge: string; icon: string }[] = [];
    const today = new Date();

    // 1. Expected Arrivals (within 7 days)
    bShipments.forEach(s => {
        if (s.status === 'At Sea' || s.status === 'Port Clearance') {
            const etaDate = new Date(s.eta);
            const diffDays = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
                alerts.push({ title: 'Expected Stock Arrival', unit: `${s.vehicle} arriving in ${diffDays} days (${s.eta})`, badge: 'info', icon: '🚢' });
            }
        }
    });

    // 2. Debts / Unpaid Balances
    bInvoices.forEach(inv => {
        if (inv.status === 'Overdue') {
            const invDate = new Date(inv.date);
            const diffDays = Math.ceil((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
            alerts.push({ title: `Overdue Invoice Debt`, unit: `${inv.client}: ${inv.amount} (${diffDays} days overdue)`, badge: 'danger', icon: '💳' });
        }
    });
    bCompliance.forEach(c => {
        if (c.logbookDetails?.balanceLeft && c.logbookDetails.balanceLeft > 0) {
            alerts.push({ title: 'Unpaid Logbook Balance', unit: `${c.vehicle}: ${fmt(c.logbookDetails.balanceLeft)} pending`, badge: 'danger', icon: '💰' });
        }
    });

    // 3. Time Documents Pending Signatures
    bCompliance.forEach(c => {
        if (c.esign === 'Pending') {
            alerts.push({ title: 'Signature Pending', unit: `${c.client} for ${c.vehicle}`, badge: 'warning', icon: '✍️' });
        }
    });

    // 4. Other
    const activeROs = bROs.filter(r => r.status !== 'Completed');
    if (activeROs.length > 0) alerts.push({ title: `${activeROs.length} Active Service ROs`, unit: `Next due: ${activeROs[0]?.due || 'Today'}`, badge: 'info', icon: '🔧' });

    const premiumVehicles = bVehicles.filter(v => v.status === 'In Stock' || v.status === 'In Transit').slice(0, 4);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />

            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Welcome back, {user.name} 👋</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Role: <span style={{ color: 'var(--secondary-accent)' }}>{user.role}</span>
                            &nbsp;|&nbsp;
                            <span style={{ color: selectedBranch === 'All' ? 'var(--secondary-accent)' : selectedBranch === 'Kampala Main' ? 'var(--primary)' : selectedBranch === 'Jinja Showroom' ? '#a78bfa' : '#34d399' }}>
                                {selectedBranch === 'All' ? '🌐 All Branches' : selectedBranch}
                            </span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {(user.role === 'Admin' || user.role === 'Sales') && (
                            <button className="btn-primary" onClick={() => router.push('/sales')}>+ New Deal</button>
                        )}
                        <button className="btn-outline" onClick={logout}>Sign Out</button>
                    </div>
                </header>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <KpiCard title="Gross Profit (MTD)" value={fmt(grossProfit)} trend="+12.5%" icon="💹" />
                    <KpiCard title="Units Sold" value={unitsSold.toString()} trend={`+${closedDeals.length} this session`} icon="🚗" />
                    <KpiCard title="Active Leads" value={activeLeadsCount.toString()} trend="Pipeline" icon="👥" neutral />
                    <KpiCard title="Service Revenue (MTD)" value={fmt(serviceRevValue)} trend="+8.1%" icon="🔧" />
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
                    {/* Sales Trend Chart */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Sales & Leads Trend (YTD)</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monthly units & lead volume</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--primary)' }}>● Sales Units</span>
                                <span style={{ color: 'var(--secondary-accent)' }}>● Leads</span>
                            </div>
                        </div>
                        <LineChart
                            data={salesTrendData}
                            data2={leadsTrendData}
                            height={220}
                            color="#f97316"
                            color2="#38bdf8"
                            formatValue={v => `${v} units`}
                        />
                    </div>

                    {/* Inventory Donut */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem' }}>Inventory Breakdown</h3>
                        <DonutChart
                            segments={[
                                { label: 'In Stock', value: inStock, color: '#10b981' },
                                { label: 'In Transit', value: inTransit, color: '#38bdf8' },
                                { label: 'Reserved', value: reserved, color: '#f59e0b' },
                                { label: 'Sold', value: sold, color: '#ef4444' },
                            ]}
                            size={130}
                            label={`${bVehicles.length}`}
                            sublabel="Total Units"
                        />
                        <button className="btn-outline" style={{ marginTop: 'auto', fontSize: '0.85rem' }} onClick={() => router.push('/inventory')}>
                            Manage Inventory →
                        </button>
                    </div>
                </div>

                {/* Time-Tracking Alerts + Inventory Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem' }}>
                    {/* Alert Center */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1rem' }}>⏰ Alerts & Follow-Ups</h3>
                            <span className="badge badge-warning">{alerts.length}</span>
                        </div>
                        {alerts.length > 0 ? alerts.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.15rem' }}>{item.title}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unit}</p>
                                    </div>
                                </div>
                                <span className={`badge badge-${item.badge}`} style={{ flexShrink: 0, fontSize: '0.65rem' }}>
                                    {item.badge === 'danger' ? 'Urgent' : 'Pending'}
                                </span>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>✅</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All clear — no pending alerts.</p>
                            </div>
                        )}
                    </div>

                    {/* Premium Inventory */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Available Premium Inventory</h3>
                            <a href="#" onClick={(e) => { e.preventDefault(); router.push('/inventory'); }} style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>View All →</a>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            {premiumVehicles.map(car => (
                                <CarCard key={car.id} make={car.make} model={car.model} year={car.year.toString()} price={car.price} status={car.status} cost={car.cost} />
                            ))}
                            {premiumVehicles.length === 0 && (
                                <p style={{ color: 'var(--text-muted)', gridColumn: 'span 2', textAlign: 'center', padding: '2rem' }}>No vehicles currently in stock.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Deals Mini-Table */}
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem' }}>Recent Deals</h3>
                        <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }} onClick={() => router.push('/sales')}>View All Deals</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                {['Deal ID', 'Client / Vehicle', 'Margin', 'Agent', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bDeals.slice(-5).reverse().map((deal, idx, arr) => (
                                <tr key={deal.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{deal.id}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{deal.client}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deal.vehicle}</div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--success)' }}>{deal.margin}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>{deal.agent}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span className={`badge ${deal.status === 'Closed' ? 'badge-success' : 'badge-warning'}`}>{deal.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    );
}

function KpiCard({ title, value, trend, icon, neutral = false, isNegative = false }: any) {
    const trendColor = neutral ? 'var(--text-muted)' : isNegative ? 'var(--danger)' : 'var(--success)';
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{title}</p>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            </div>
            <h3 style={{ fontSize: '1.7rem', margin: 0, fontWeight: 700 }}>{value}</h3>
            <span style={{ color: trendColor, fontSize: '0.78rem', fontWeight: 600 }}>{trend}</span>
        </div>
    );
}

function CarCard({ make, model, year, price, status, cost }: any) {
    const badgeClass = status === 'In Stock' ? 'badge-success' : 'badge-info';
    const gradients: Record<string, string> = {
        BMW: 'linear-gradient(135deg, #1a2a4a, #0a1628)',
        Porsche: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        Mercedes: 'linear-gradient(135deg, #1f1f1f, #2d2d2d)',
        Lexus: 'linear-gradient(135deg, #1a2a3a, #0d1b2a)',
        'Land Rover': 'linear-gradient(135deg, #1a2e1a, #0d1f0d)',
    };
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '110px', background: gradients[make] || 'linear-gradient(135deg, #1e293b, #0f172a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem' }}>🚗</span>
                <span className={`badge ${badgeClass}`} style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.65rem' }}>{status}</span>
            </div>
            <div style={{ padding: '1rem' }}>
                <p style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{year} {make}</p>
                <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0.5rem' }}>{model}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700 }}>{price}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cost: {cost}</p>
                </div>
            </div>
        </div>
    );
}
