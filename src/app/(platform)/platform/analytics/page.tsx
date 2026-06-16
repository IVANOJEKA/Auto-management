'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNav from '../../../../components/PlatformNav';

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
    const [tenants, setTenants] = useState<TenantData[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [activeMetric, setActiveMetric] = useState<'vehicles' | 'deals' | 'users'>('vehicles');

    const logout = useCallback(async () => {
        await fetch('/api/platform/auth', { method: 'DELETE' });
        router.push('/platform/login');
    }, [router]);

    useEffect(() => {
        async function init() {
            const authRes = await fetch('/api/platform/auth');
            const authData = await authRes.json();
            if (!authData.authenticated) { router.push('/platform/login'); return; }
            setAuthChecked(true);
            const statsRes = await fetch('/api/platform/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                setTenants(data.tenants || []);
                setSummary(data.summary);
            }
            setLoading(false);
        }
        init();
    }, [router]);

    const metricKey = activeMetric === 'vehicles' ? 'vehicleCount' : activeMetric === 'deals' ? 'dealCount' : 'userCount';
    const maxVal = Math.max(...tenants.map(t => (t as any)[metricKey] || 0), 1);

    const METRIC_TABS = [
        { key: 'vehicles', label: '🚗 Vehicles' },
        { key: 'deals', label: '🤝 Deals' },
        { key: 'users', label: '👥 Users' },
    ] as const;

    if (!authChecked) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Verifying session...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh' }}>
            <PlatformNav onLogout={logout} />
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

                {/* Header */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', letterSpacing: '-0.03em' }}>Cross-Tenant Analytics</h1>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                        Platform-wide usage metrics across all {summary?.totalTenants ?? '—'} workspaces
                    </p>
                </div>

                {/* Summary KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
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
                            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: loading ? 'rgba(255,255,255,0.15)' : 'white', letterSpacing: '-0.03em' }}>{loading ? '—' : k.val}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
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

                        {loading ? (
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
                            {loading ? (
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
                            {loading ? (
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

                        {/* User bar chart */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Users per Workspace</h2>
                            {loading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {[...Array(4)].map((_, i) => <div key={i} style={{ height: '28px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />)}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {tenants.map((t, i) => (
                                        <div key={t.id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{t.name}</span>
                                            </div>
                                            <MiniBar value={t.userCount} max={Math.max(...tenants.map(x => x.userCount), 1)} color={BAR_COLORS[i % BAR_COLORS.length]} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
