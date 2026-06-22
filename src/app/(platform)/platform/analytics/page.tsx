'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNav from '../../../../components/PlatformNav';
import '../../../../app/globals.css';

interface TenantData {
    id: string;
    name: string;
    subdomain: string;
    plan: string;
    status: string;
    created_at: string;
    userCount: number;
    vehicleCount: number;
    dealCount: number;
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.8s ease', boxShadow: `0 0 6px ${color}88` }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', minWidth: '24px', textAlign: 'right' }}>{value}</span>
        </div>
    );
}

function StatRow({ label, value, total }: { label: string; value: number; total: number }) {
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(99,102,241,0.07)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>{value}</span>
                <span style={{ fontSize: '0.68rem', color: '#6366f1' }}>{pct}%</span>
            </div>
        </div>
    );
}

export default function PlatformAnalyticsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dms' | 'traffic' | 'requests'>('dms');
    
    // DMS stats state
    const [tenants, setTenants] = useState<TenantData[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loadingDms, setLoadingDms] = useState(true);
    const [activeMetric, setActiveMetric] = useState<'vehicles' | 'deals' | 'users'>('vehicles');

    // Website analytics state
    const [visitors, setVisitors] = useState<any[]>([]);
    const [demoRequests, setDemoRequests] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [deviceDist, setDeviceDist] = useState<Record<string, number>>({});
    const [locationDist, setLocationDist] = useState<Record<string, number>>({});
    const [loadingWeb, setLoadingWeb] = useState(true);
    
    const [authChecked, setAuthChecked] = useState(false);

    const logout = useCallback(async () => {
        await fetch('/api/platform/auth', { method: 'DELETE' });
        router.push('/platform/login');
    }, [router]);

    const loadDmsStats = useCallback(async () => {
        setLoadingDms(true);
        try {
            const statsRes = await fetch('/api/platform/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                setTenants(data.tenants || []);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDms(false);
        }
    }, []);

    const loadWebAnalytics = useCallback(async () => {
        setLoadingWeb(true);
        try {
            const res = await fetch('/api/platform/analytics');
            if (res.ok) {
                const data = await res.json();
                setVisitors(data.visitors || []);
                setDemoRequests(data.demoRequests || []);
                setReviews(data.reviews || []);
                setDeviceDist(data.deviceDistribution || {});
                setLocationDist(data.locationDistribution || {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingWeb(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            const authRes = await fetch('/api/platform/auth');
            const authData = await authRes.json();
            if (!authData.authenticated) { router.push('/platform/login'); return; }
            setAuthChecked(true);
            await loadDmsStats();
            await loadWebAnalytics();
        }
        init();
    }, [router, loadDmsStats, loadWebAnalytics]);

    const handleUpdateDemoStatus = async (id: string, nextStatus: string) => {
        try {
            const res = await fetch('/api/platform/analytics', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'demo', id, status: nextStatus })
            });
            if (res.ok) {
                setDemoRequests(prev => prev.map(d => d.id === id ? { ...d, status: nextStatus } : d));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateReviewStatus = async (id: string, nextStatus: string) => {
        try {
            const res = await fetch('/api/platform/analytics', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'review', id, status: nextStatus })
            });
            if (res.ok) {
                setReviews(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const metricKey = activeMetric === 'vehicles' ? 'vehicleCount' : activeMetric === 'deals' ? 'dealCount' : 'userCount';
    const maxVal = Math.max(...tenants.map(t => (t as any)[metricKey] || 0), 1);

    const METRIC_TABS = [
        { key: 'vehicles', label: '🚗 Vehicles' },
        { key: 'deals', label: '🤝 Deals' },
        { key: 'users', label: '👥 Users' },
    ] as const;

    const inputStyle: React.CSSProperties = { background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.8rem' };
    const thStyle: React.CSSProperties = { padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' };
    const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)' };

    if (!authChecked) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060614', color: 'white' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Verifying session...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#060614', color: 'white' }}>
            <PlatformNav onLogout={logout} />
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', letterSpacing: '-0.03em' }}>System Operations & Analytics</h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                            Monitor system usage metrics, landing page visitor sessions, demo inquiries, and public feedback reviews.
                        </p>
                    </div>
                    
                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setActiveTab('dms')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: activeTab === 'dms' ? '#6366f1' : 'transparent', color: activeTab === 'dms' ? 'white' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                            🏢 DMS Metrics
                        </button>
                        <button onClick={() => setActiveTab('traffic')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: activeTab === 'traffic' ? '#6366f1' : 'transparent', color: activeTab === 'traffic' ? 'white' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                            📈 Website Traffic
                        </button>
                        <button onClick={() => setActiveTab('requests')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: activeTab === 'requests' ? '#6366f1' : 'transparent', color: activeTab === 'requests' ? 'white' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                            ✉️ Demos & Reviews
                        </button>
                    </div>
                </div>

                {/* ─── TAB 1: DMS USAGE METRICS ─── */}
                {activeTab === 'dms' && (
                    <>
                        {/* Summary KPIs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }} className="kpi-grid">
                            {[
                                { label: 'Total Workspaces', val: summary?.totalTenants ?? '—', icon: '🏢', color: '#6366f1' },
                                { label: 'Total Users', val: summary?.totalUsers ?? '—', icon: '👥', color: '#8b5cf6' },
                                { label: 'Total Vehicles', val: summary?.totalVehicles ?? '—', icon: '🚗', color: '#06b6d4' },
                                { label: 'Total Deals', val: summary?.totalDeals ?? '—', icon: '🤝', color: '#10b981' },
                            ].map(k => (
                                <div key={k.label} style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '14px', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{k.label}</span>
                                        <span style={{ fontSize: '1.1rem' }}>{k.icon}</span>
                                    </div>
                                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: loadingDms ? 'rgba(255,255,255,0.15)' : 'white', letterSpacing: '-0.03em' }}>{loadingDms ? '—' : k.val}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }} className="grid-2col-1-side">
                            {/* Bar Chart */}
                            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Per-Workspace Breakdown</h2>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {METRIC_TABS.map(tab => (
                                            <button key={tab.key} onClick={() => setActiveMetric(tab.key)} style={{
                                                padding: '0.35rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                                background: activeMetric === tab.key ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                                                color: activeMetric === tab.key ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                                                border: activeMetric === tab.key ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.08)',
                                            }}>
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {loadingDms ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} style={{ height: '40px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                                        ))}
                                    </div>
                                ) : tenants.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>No tenant data available</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                        {tenants.map((t, i) => {
                                            const val = (t as any)[metricKey] || 0;
                                            const color = BAR_COLORS[i % BAR_COLORS.length];
                                            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                            return (
                                                <div key={t.id}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: `${color}30`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color }}>
                                                                {t.name.charAt(0)}
                                                            </div>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t.name}</span>
                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{t.subdomain}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{val}</span>
                                                    </div>
                                                    <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: '99px', transition: 'width 1s ease', boxShadow: `0 0 8px ${color}66` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Right column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Platform distribution */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Vehicles Distribution</h2>
                                    {loadingDms ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {[...Array(4)].map((_, i) => <div key={i} style={{ height: '32px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />)}
                                        </div>
                                    ) : (
                                        <div>
                                            {tenants.map(t => (
                                                <StatRow key={t.id} label={t.name} value={t.vehicleCount} total={summary?.totalVehicles || 1} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Deals distribution */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Deals Distribution</h2>
                                    {loadingDms ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {[...Array(4)].map((_, i) => <div key={i} style={{ height: '32px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />)}
                                        </div>
                                    ) : (
                                        <div>
                                            {tenants.map(t => (
                                                <StatRow key={t.id} label={t.name} value={t.dealCount} total={summary?.totalDeals || 1} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ─── TAB 2: WEBSITE TRAFFIC ─── */}
                {activeTab === 'traffic' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }} className="grid-2col-1-side">
                        
                        {/* Traffic log */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Live Visitor Session Logs</h3>
                                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>● Real-time sync</span>
                            </div>

                            {loadingWeb ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[...Array(5)].map((_, i) => <div key={i} style={{ height: '50px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />)}
                                </div>
                            ) : visitors.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No visitor logs detected.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>Visitor / Identity</th>
                                                <th style={thStyle}>Location</th>
                                                <th style={thStyle}>Device Type</th>
                                                <th style={thStyle}>Duration</th>
                                                <th style={thStyle}>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visitors.map(v => (
                                                <tr key={v.id}>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ fontSize: '1rem' }}>👤</span>
                                                            <div>
                                                                <span style={{ fontWeight: 600 }}>{v.name || 'Anonymous Visitor'}</span>
                                                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>Path: {v.path || '/'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            🌍 {v.location || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px',
                                                            background: v.device_type === 'Mobile' ? 'rgba(16,185,129,0.1)' : v.device_type === 'Tablet' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                                            color: v.device_type === 'Mobile' ? '#10b981' : v.device_type === 'Tablet' ? '#f59e0b' : '#a5b4fc'
                                                        }}>
                                                            {v.device_type === 'Mobile' ? '📱 Mobile' : v.device_type === 'Tablet' ? '📟 Tablet' : '🖥️ Desktop'}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>⏱️ {v.duration || '—'}</span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                                                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Traffic widgets */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Device Share */}
                            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Device Distribution</h3>
                                {loadingWeb ? (
                                    <p>Loading...</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {Object.entries(deviceDist).map(([dev, count], i) => (
                                            <div key={dev}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                    <span>{dev}</span>
                                                    <span style={{ fontWeight: 800 }}>{count} sessions</span>
                                                </div>
                                                <MiniBar value={count} max={Math.max(...Object.values(deviceDist), 1)} color={BAR_COLORS[i % BAR_COLORS.length]} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Top Locations */}
                            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Top Visitor Locations</h3>
                                {loadingWeb ? (
                                    <p>Loading...</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {Object.entries(locationDist).map(([loc, count], i) => (
                                            <div key={loc}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                    <span>{loc}</span>
                                                    <span style={{ fontWeight: 800 }}>{count} visitors</span>
                                                </div>
                                                <MiniBar value={count} max={Math.max(...Object.values(locationDist), 1)} color={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* ─── TAB 3: DEMO REQUESTS & REVIEWS ─── */}
                {activeTab === 'requests' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-2col-1-2">
                        
                        {/* Demo Requests Panel */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700 }}>Landing Page Demo Requests</h3>

                            {loadingWeb ? (
                                <p>Loading...</p>
                            ) : demoRequests.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No demo inquiries yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {demoRequests.map(demo => (
                                        <div key={demo.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>{demo.name}</h4>
                                                <select 
                                                    value={demo.status} 
                                                    onChange={e => handleUpdateDemoStatus(demo.id, e.target.value)}
                                                    style={{ 
                                                        ...inputStyle, 
                                                        background: demo.status === 'Completed' ? 'rgba(16,185,129,0.15)' : demo.status === 'Contacted' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: demo.status === 'Completed' ? '#10b981' : demo.status === 'Contacted' ? '#f59e0b' : '#ef4444',
                                                        borderColor: demo.status === 'Completed' ? '#10b98155' : demo.status === 'Contacted' ? '#f59e0b55' : '#ef444455',
                                                        fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px'
                                                    }}
                                                >
                                                    <option value="Pending">🔴 Pending</option>
                                                    <option value="Contacted">🟡 Contacted</option>
                                                    <option value="Completed">🟢 Completed</option>
                                                </select>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                📧 {demo.email} &nbsp;|&nbsp; 📞 {demo.phone || '—'}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: '0.2rem 0 0 0', lineHeight: 1.4, background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
                                                "{demo.message}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reviews Panel */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700 }}>Client Reviews & Testimonials</h3>

                            {loadingWeb ? (
                                <p>Loading...</p>
                            ) : reviews.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No reviews submitted yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {reviews.map(rev => (
                                        <div key={rev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '1.1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>{rev.name}</h4>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.1rem' }}>{rev.role || 'Dealership Executive'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                                                        {'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}
                                                    </span>
                                                    <select
                                                        value={rev.status}
                                                        onChange={e => handleUpdateReviewStatus(rev.id, e.target.value)}
                                                        style={{
                                                            ...inputStyle,
                                                            background: rev.status === 'approved' ? 'rgba(16,185,129,0.12)' : rev.status === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                                            color: rev.status === 'approved' ? '#10b981' : rev.status === 'pending' ? '#f59e0b' : '#ef4444',
                                                            borderColor: rev.status === 'approved' ? '#10b98144' : rev.status === 'pending' ? '#f59e0b44' : '#ef444444',
                                                            fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px'
                                                        }}
                                                    >
                                                        <option value="approved">Approved</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="rejected">Rejected</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: '0.3rem 0 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                                                "{rev.comments}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </main>
        </div>
    );
}
