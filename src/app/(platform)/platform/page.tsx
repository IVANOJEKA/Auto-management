'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNav from '../../../components/PlatformNav';

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

interface Stats {
    tenants: TenantData[];
    summary: {
        totalTenants: number;
        totalUsers: number;
        totalVehicles: number;
        totalDeals: number;
        newThisMonth: number;
    };
    health: { database: string; api: string; uptime: string };
}

const indigo = '#6366f1';
const violet = '#8b5cf6';
const success = '#10b981';
const warning = '#f59e0b';

const PLAN_COLORS: Record<string, string> = {
    enterprise: '#f59e0b',
    professional: '#6366f1',
    starter: '#10b981',
    free: '#64748b',
};

function KPICard({ label, value, sub, icon, color = indigo, glow = false }: {
    label: string; value: string | number; sub?: string; icon: string; color?: string; glow?: boolean;
}) {
    return (
        <div style={{
            background: `rgba(99,102,241,0.05)`,
            border: `1px solid rgba(99,102,241,0.15)`,
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(99,102,241,0.2)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {glow && <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, borderRadius: '50%' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '1.4rem', opacity: 0.8 }}>{icon}</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'white', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: `${color}cc`, marginTop: '0.5rem', fontWeight: 600 }}>{sub}</div>}
        </div>
    );
}

function HealthBadge({ label, status }: { label: string; status: string }) {
    const isOk = status === 'connected' || status === 'ok';
    const color = isOk ? success : (status === 'offline' ? '#64748b' : warning);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: `${color}11`, border: `1px solid ${color}33`, borderRadius: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, boxShadow: isOk ? `0 0 8px ${color}` : 'none', flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'capitalize' }}>{status}</span>
        </div>
    );
}

export default function PlatformOverviewPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [copied, setCopied] = useState(false);

    const logout = useCallback(async () => {
        await fetch('/api/platform/auth', { method: 'DELETE' });
        router.push('/platform/login');
    }, [router]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const statsRes = await fetch('/api/platform/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            const authRes = await fetch('/api/platform/auth');
            const authData = await authRes.json();
            if (!authData.authenticated) {
                router.push('/platform/login');
                return;
            }
            setAuthChecked(true);
            await fetchStats();
        }
        init();
    }, [router, fetchStats]);

    const handleCopySQL = () => {
        if (stats?.sql) {
            navigator.clipboard.writeText(stats.sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', animation: 'pulse 1.5s infinite' }}>
                        <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Verifying session...</p>
                </div>
            </div>
        );
    }

    const s = stats?.summary;
    const recentTenants = stats?.tenants?.slice(0, 5) || [];

    return (
        <div style={{ minHeight: '100vh' }}>
            <PlatformNav onLogout={logout} />

            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

                {/* Header */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                            Platform Overview
                        </h1>
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                            background: stats?.migrationRequired ? 'rgba(245,158,11,0.12)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: stats?.migrationRequired ? '#f59e0b' : 'white',
                            padding: '0.2rem 0.6rem', borderRadius: '6px', letterSpacing: '0.08em',
                            border: stats?.migrationRequired ? '1px solid rgba(245,158,11,0.2)' : 'none'
                        }}>{stats?.migrationRequired ? 'Migration Required' : 'Live'}</span>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                        Cross-tenant metrics and workspace health for all GariSphere deployments
                    </p>
                </div>

                {/* Migration Check Block */}
                {stats?.migrationRequired ? (
                    <div style={{
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '20px',
                        padding: '2rem',
                        marginBottom: '3rem',
                        boxShadow: '0 10px 40px rgba(245,158,11,0.05)'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '2rem' }}>⚠️</span>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem', color: '#f59e0b', fontSize: '1.15rem', fontWeight: 800 }}>Database Migration Required</h3>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                    Your Supabase database does not have the <code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace' }}>tenants</code> table or <code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace' }}>tenant_id</code> keys. 
                                    To unlock tenant workspace creation and data isolation, execute the SQL script below inside your <strong>Supabase SQL Editor</strong>.
                                </p>
                            </div>
                        </div>

                        <div style={{ position: 'relative', background: '#020617', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>migration.sql</span>
                                <button 
                                    onClick={handleCopySQL}
                                    style={{
                                        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                                        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        color: copied ? '#34d399' : 'white',
                                        padding: '0.35rem 0.85rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {copied ? 'Copied! ✓' : '📋 Copy SQL Script'}
                                </button>
                            </div>
                            <pre style={{
                                margin: 0,
                                padding: '1.25rem',
                                overflowX: 'auto',
                                maxHeight: '320px',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                color: '#a5b4fc',
                                lineHeight: 1.5,
                                background: 'transparent'
                            }}>
                                {stats?.sql}
                            </pre>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button 
                                onClick={fetchStats}
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(245,158,11,0.2)',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {loading ? 'Checking Database...' : '🔄 Check Migration Status'}
                            </button>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                                Run the SQL script, wait 5 seconds, then click verify.
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Main Content (KPI Grid + Details) */}
                {!stats?.migrationRequired && (
                    <>
                        {/* KPI Grid */}
                        {loading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} style={{ height: '130px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <KPICard label="Active Workspaces" value={s?.totalTenants ?? 0} icon="🏢" sub={`+${s?.newThisMonth ?? 0} this month`} glow />
                                <KPICard label="Total Users" value={s?.totalUsers ?? 0} icon="👥" color={violet} glow />
                                <KPICard label="Vehicles Listed" value={s?.totalVehicles ?? 0} icon="🚗" color="#06b6d4" glow />
                                <KPICard label="Total Deals" value={s?.totalDeals ?? 0} icon="🤝" color={success} glow />
                                <KPICard label="New Tenants" value={s?.newThisMonth ?? 0} icon="✨" color={warning} sub="this month" glow />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>

                            {/* Recent Tenants Table */}
                            <div style={{
                                background: 'rgba(99,102,241,0.04)',
                                border: '1px solid rgba(99,102,241,0.12)',
                                borderRadius: '16px', overflow: 'hidden',
                            }}>
                                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Workspaces</h2>
                                    <button
                                        onClick={() => router.push('/platform/tenants')}
                                        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                                                {['Workspace', 'Plan', 'Users', 'Vehicles', 'Joined', 'Status'].map(h => (
                                                    <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                [...Array(4)].map((_, i) => (
                                                    <tr key={i}>
                                                        {[...Array(5)].map((_, j) => (
                                                            <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                                                <div style={{ height: '14px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : recentTenants.length === 0 ? (
                                                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>No workspaces found</td></tr>
                                            ) : (
                                                recentTenants.map((t, idx) => (
                                                    <tr key={t.id} style={{ borderBottom: idx < recentTenants.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                                                                    {t.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.name}</div>
                                                                    <div style={{ fontSize: '0.68rem', color: '#a5b4fc', fontFamily: 'monospace', opacity: 0.7 }}>{t.subdomain}.garisphere.com</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', color: PLAN_COLORS[t.plan] || '#64748b', background: `${PLAN_COLORS[t.plan] || '#64748b'}18`, border: `1px solid ${PLAN_COLORS[t.plan] || '#64748b'}30`, padding: '0.2rem 0.55rem', borderRadius: '5px' }}>{t.plan || 'starter'}</span>
                                                        </td>
                                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{t.userCount}</td>
                                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{t.vehicleCount}</td>
                                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                                            <span style={{
                                                                fontSize: '0.68rem', fontWeight: 700,
                                                                background: t.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                                                                color: t.status === 'active' ? '#34d399' : '#fca5a5',
                                                                border: `1px solid ${t.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                                padding: '0.2rem 0.5rem', borderRadius: '5px', textTransform: 'capitalize'
                                                            }}>{t.status}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* System Health */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>System Health</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <HealthBadge label="Database" status={stats?.health?.database ?? 'checking...'} />
                                        <HealthBadge label="API Layer" status={stats?.health?.api ?? 'checking...'} />
                                        <HealthBadge label="Uptime" status={stats?.health?.uptime ?? '—'} />
                                    </div>
                                </div>

                                {/* Plan Breakdown */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Plan Breakdown</h2>
                                    {(() => {
                                        const plans = [{ key: 'enterprise', label: 'Enterprise', color: '#f59e0b' }, { key: 'professional', label: 'Professional', color: '#6366f1' }, { key: 'starter', label: 'Starter', color: '#10b981' }];
                                        const total = (stats?.tenants || []).length || 1;
                                        return plans.map(p => {
                                            const count = (stats?.tenants || []).filter((t: any) => t.plan === p.key).length;
                                            const pct = Math.round((count / total) * 100);
                                            return (
                                                <div key={p.key} style={{ marginBottom: '0.85rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.75rem', color: p.color, fontWeight: 600 }}>{p.label}</span>
                                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{count} workspace{count !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Quick Actions */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                                    <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {[
                                            { label: 'Manage Tenants', path: '/platform/tenants', icon: '🏢' },
                                            { label: 'View Analytics', path: '/platform/analytics', icon: '📈' },
                                            { label: 'Open DMS Dashboard', path: '/', icon: '↗' },
                                        ].map(a => (
                                            <button key={a.path} onClick={() => router.push(a.path)} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.7rem',
                                                width: '100%', padding: '0.7rem 0.9rem', borderRadius: '9px',
                                                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)',
                                                color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 600,
                                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                            }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                                            >
                                                <span>{a.icon}</span> {a.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Platform info */}
                                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                                    <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Platform Info</h2>
                                    {[
                                        { label: 'Architecture', val: 'SaaS Multi-Tenant' },
                                        { label: 'Isolation', val: 'Subdomain + Row-Level' },
                                        { label: 'Auth Strategy', val: 'Admin Key + Cookie' },
                                        { label: 'DB Mode', val: 'Multi-Tenant ✅' },
                                        { label: 'Version', val: 'v2.0.0' },
                                    ].map(r => (
                                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
