'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNav from '../../../components/PlatformNav';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG        = '#070714';
const CARD_BG   = 'rgba(15,15,40,0.8)';
const CARD_BORDER = '1px solid rgba(99,102,241,0.15)';
const ACCENT    = '#6366f1';
const VIOLET    = '#8b5cf6';
const CYAN      = '#06b6d4';
const SUCCESS   = '#10b981';
const WARNING   = '#f59e0b';
const DANGER    = '#ef4444';
const MUTED     = 'rgba(255,255,255,0.45)';

const PLAN_COLORS: Record<string, string> = {
    enterprise:   WARNING,
    professional: ACCENT,
    starter:      SUCCESS,
    free:         '#64748b',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
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
    business_type?: string;
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
    migrationRequired?: boolean;
    sql?: string;
}

// ─── SVG Icon helpers ─────────────────────────────────────────────────────────
function IconBuilding() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
        </svg>
    );
}
function IconUsers() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    );
}
function IconCar() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17H5a2 2 0 0 1-2-2V9l2-4h14l2 4v6a2 2 0 0 1-2 2z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>
        </svg>
    );
}
function IconDeal() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
    );
}
function IconSpark() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/>
        </svg>
    );
}
function IconRefresh() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    );
}
function IconShield() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    );
}
function IconExternal() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
    );
}
function IconEdit() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
        </svg>
    );
}

// ─── Business Type helpers ────────────────────────────────────────────────────
function getBusinessLabel(business_type?: string): string {
    if (business_type === 'spare_parts') return '🔧 Spare Parts';
    if (business_type === 'workshop')    return '🏭 Workshop';
    return '🚗 Dealership';
}

function getBusinessColor(business_type?: string): string {
    if (business_type === 'spare_parts') return CYAN;
    if (business_type === 'workshop')    return VIOLET;
    return ACCENT;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KPICard({
    label, value, sub, icon, color = ACCENT, glow = false,
}: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; color?: string; glow?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: CARD_BG,
                border: CARD_BORDER,
                borderRadius: '16px',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hovered ? `0 8px 32px ${color}33` : '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'default',
            }}
        >
            {glow && (
                <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '120px', height: '120px',
                    background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                    borderRadius: '50%', pointerEvents: 'none',
                }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>
                    {label}
                </span>
                <span style={{ color, opacity: 0.85 }}>{icon}</span>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'white', lineHeight: 1 }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: '0.7rem', color: `${color}cc`, marginTop: '0.5rem', fontWeight: 600 }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

function HealthBadge({ label, status }: { label: string; status: string }) {
    const isOk    = status === 'connected' || status === 'ok' || status.includes('%') || status.includes('d') || status.includes('h');
    const isWarn  = status === 'degraded';
    const color   = isOk ? SUCCESS : isWarn ? WARNING : DANGER;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.6rem 1rem',
            background: `${color}11`, border: `1px solid ${color}33`, borderRadius: '8px',
        }}>
            <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: color,
                boxShadow: isOk ? `0 0 8px ${color}` : 'none',
                flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'capitalize' }}>
                {status}
            </span>
        </div>
    );
}

function BusinessTypeCard({
    emoji, label, count, total, color,
}: {
    emoji: string; label: string; count: number; total: number; color: string;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{
            background: CARD_BG, border: CARD_BORDER, borderRadius: '16px', padding: '1.5rem',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
                <div>
                    <div style={{ fontSize: '0.75rem', color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{count}</div>
                </div>
                <div style={{
                    marginLeft: 'auto', fontSize: '1rem', fontWeight: 800, color,
                    background: `${color}15`, border: `1px solid ${color}30`,
                    borderRadius: '8px', padding: '0.25rem 0.6rem',
                }}>
                    {pct}%
                </div>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                    borderRadius: '999px', transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                }} />
            </div>
        </div>
    );
}

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: '0.72rem', color: MUTED }}>{count} workspace{count !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`, background: color,
                    borderRadius: '999px', transition: 'width 0.6s ease',
                }} />
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlatformOverviewPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [copied, setCopied] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const logout = useCallback(async () => {
        await fetch('/api/platform/auth', { method: 'DELETE' });
        router.push('/platform/login');
    }, [router]);

    const fetchStats = useCallback(async () => {
        setRefreshing(true);
        setLoading(true);
        try {
            const statsRes = await fetch('/api/platform/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
                setLastRefresh(new Date());
            }
        } catch (_) {
            // silently ignore
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            const authRes  = await fetch('/api/platform/auth');
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

    // ── Loading / auth gate ──────────────────────────────────────────────────
    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px', height: '48px', margin: '0 auto 1rem',
                        background: 'white', borderRadius: '12px', overflow: 'hidden',
                        boxShadow: `0 0 32px ${ACCENT}55`,
                        animation: 'pulse 1.5s infinite',
                    }}>
                        <img src="/garisphere-logo.png" alt="GariSphere" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Verifying session…</p>
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
            </div>
        );
    }

    const s              = stats?.summary;
    const allTenants     = stats?.tenants ?? [];
    const recentTenants  = allTenants.slice(0, 8);
    const totalTenants   = allTenants.length;

    const dealerCount    = allTenants.filter(t => !t.business_type || t.business_type === 'dealership').length;
    const spareCount     = allTenants.filter(t => t.business_type === 'spare_parts').length;
    const workshopCount  = allTenants.filter(t => t.business_type === 'workshop').length;

    const formatTime = (d: Date) =>
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div style={{ minHeight: '100vh', background: BG, color: 'white', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
            {/* Global keyframes */}
            <style>{`
                @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
                @keyframes spin  { to{transform:rotate(360deg)} }
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
                ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius:99px; }
            `}</style>

            {/* ── Top Nav (PlatformNav) ─────────────────────────────────────── */}
            <PlatformNav onLogout={logout} />

            {/* ── Main ─────────────────────────────────────────────────────── */}
            <main style={{ maxWidth: '1320px', margin: '0 auto', padding: '2rem 2rem 5rem' }}>

                {/* ── Top Bar ──────────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                            Platform Overview
                        </h1>
                        {/* Live badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: `${SUCCESS}15`, border: `1px solid ${SUCCESS}35`,
                            borderRadius: '20px', padding: '0.25rem 0.75rem',
                        }}>
                            <span style={{
                                width: '7px', height: '7px', borderRadius: '50%', background: SUCCESS,
                                boxShadow: `0 0 8px ${SUCCESS}`,
                                animation: 'pulse 2s infinite',
                                display: 'inline-block',
                            }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: SUCCESS, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live</span>
                        </div>
                    </div>

                    {/* Refresh controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {lastRefresh && (
                            <span style={{ fontSize: '0.72rem', color: MUTED }}>
                                Last refresh: <span style={{ color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(lastRefresh)}</span>
                            </span>
                        )}
                        <button
                            onClick={fetchStats}
                            disabled={refreshing}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`,
                                color: '#a5b4fc', borderRadius: '8px',
                                padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 600,
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                opacity: refreshing ? 0.6 : 1,
                            }}
                            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = `${ACCENT}25`; e.currentTarget.style.color = 'white'; }}}
                            onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}15`; e.currentTarget.style.color = '#a5b4fc'; }}
                        >
                            <span style={{ display: 'flex', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
                                <IconRefresh />
                            </span>
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* ── Migration Warning ─────────────────────────────────────── */}
                {stats?.migrationRequired && (
                    <div style={{
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.28)',
                        borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem',
                        boxShadow: '0 10px 40px rgba(245,158,11,0.06)',
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>⚠️</span>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem', color: WARNING, fontSize: '1.1rem', fontWeight: 800 }}>
                                    Database Migration Required
                                </h3>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.87rem', lineHeight: 1.65 }}>
                                    Your Supabase database is missing the{' '}
                                    <code style={{ color: WARNING, background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace' }}>tenants</code> table
                                    {' '}or <code style={{ color: WARNING, background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace' }}>tenant_id</code> keys.
                                    {' '}Run the SQL script below inside your <strong>Supabase SQL Editor</strong> to enable workspace creation and data isolation.
                                </p>
                            </div>
                        </div>

                        {stats.sql && (
                            <div style={{ position: 'relative', background: '#020617', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>migration.sql</span>
                                    <button
                                        onClick={handleCopySQL}
                                        style={{
                                            background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
                                            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                            color: copied ? '#34d399' : 'white',
                                            padding: '0.35rem 0.85rem', borderRadius: '6px',
                                            fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                                        }}
                                    >
                                        {copied ? 'Copied! ✓' : '📋 Copy SQL Script'}
                                    </button>
                                </div>
                                <pre style={{
                                    margin: 0, padding: '1.25rem', overflowX: 'auto',
                                    maxHeight: '320px', fontSize: '0.8rem', fontFamily: 'monospace',
                                    color: '#a5b4fc', lineHeight: 1.55, background: 'transparent',
                                }}>
                                    {stats.sql}
                                </pre>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button
                                onClick={fetchStats}
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: 'white', border: 'none',
                                    padding: '0.75rem 1.5rem', borderRadius: '8px',
                                    fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 15px rgba(245,158,11,0.22)', transition: 'all 0.15s',
                                    opacity: loading ? 0.7 : 1,
                                }}
                                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {loading ? 'Checking Database…' : '🔄 Check Migration Status'}
                            </button>
                            <p style={{ margin: 0, color: MUTED, fontSize: '0.78rem' }}>
                                Run the SQL, wait a moment, then verify.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── KPI Cards ─────────────────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))',
                    gap: '1rem',
                    marginBottom: '2rem',
                }}>
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} style={{
                                height: '140px',
                                background: CARD_BG, border: CARD_BORDER,
                                borderRadius: '16px', animation: 'pulse 1.5s infinite',
                            }} />
                        ))
                    ) : (
                        <>
                            <KPICard label="Active Workspaces" value={s?.totalTenants ?? 0}  icon={<IconBuilding />} color={ACCENT}  glow sub={`+${s?.newThisMonth ?? 0} new this month`} />
                            <KPICard label="Total Users"       value={s?.totalUsers   ?? 0}  icon={<IconUsers />}   color={VIOLET}  glow />
                            <KPICard label="Vehicles Listed"   value={s?.totalVehicles ?? 0} icon={<IconCar />}     color={CYAN}    glow />
                            <KPICard label="Total Deals"       value={s?.totalDeals   ?? 0}  icon={<IconDeal />}    color={SUCCESS} glow />
                            <KPICard label="New This Month"    value={s?.newThisMonth  ?? 0} icon={<IconSpark />}   color={WARNING} glow sub="workspaces joined" />
                        </>
                    )}
                </div>

                {/* ── Business Type Breakdown ───────────────────────────────── */}
                {!loading && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: ACCENT }}><IconShield /></span>
                            Business Type Breakdown
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1rem' }}>
                            <BusinessTypeCard emoji="🚗" label="Dealership"      count={dealerCount}   total={totalTenants} color={ACCENT}  />
                            <BusinessTypeCard emoji="🔧" label="Spare Parts Shop" count={spareCount}    total={totalTenants} color={CYAN}    />
                            <BusinessTypeCard emoji="🏭" label="Workshop / Garage" count={workshopCount} total={totalTenants} color={VIOLET}  />
                        </div>
                    </div>
                )}

                {/* ── Main Grid ─────────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

                    {/* LEFT — Recent Workspaces Table */}
                    <div style={{
                        background: CARD_BG, border: CARD_BORDER,
                        borderRadius: '16px', overflow: 'hidden',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Workspaces</h2>
                            <button
                                onClick={() => router.push('/platform/tenants')}
                                style={{
                                    background: `${ACCENT}15`, border: `1px solid ${ACCENT}25`,
                                    color: '#a5b4fc', borderRadius: '7px',
                                    padding: '0.35rem 0.75rem', fontSize: '0.75rem',
                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}25`; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}15`; e.currentTarget.style.color = '#a5b4fc'; }}
                            >
                                View All →
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                                        {['Workspace', 'Business Type', 'Plan', 'Users', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{
                                                padding: '0.75rem 1.1rem', textAlign: 'left',
                                                fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)',
                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em',
                                                whiteSpace: 'nowrap',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i}>
                                                {[...Array(6)].map((_, j) => (
                                                    <td key={j} style={{ padding: '1rem 1.1rem' }}>
                                                        <div style={{ height: '13px', background: 'rgba(99,102,241,0.08)', borderRadius: '5px', animation: 'pulse 1.5s infinite' }} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : recentTenants.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
                                                No workspaces found
                                            </td>
                                        </tr>
                                    ) : (
                                        recentTenants.map((t, idx) => {
                                            const btLabel = getBusinessLabel(t.business_type);
                                            const btColor = getBusinessColor(t.business_type);
                                            const planColor = PLAN_COLORS[t.plan] ?? '#64748b';
                                            return (
                                                <tr
                                                    key={t.id}
                                                    style={{
                                                        borderBottom: idx < recentTenants.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                                >
                                                    {/* Workspace */}
                                                    <td style={{ padding: '0.85rem 1.1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                            <div style={{
                                                                width: '30px', height: '30px', borderRadius: '8px',
                                                                background: `linear-gradient(135deg, ${ACCENT}, ${VIOLET})`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                                                            }}>
                                                                {t.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</div>
                                                                <div style={{ fontSize: '0.67rem', color: '#a5b4fc', fontFamily: 'monospace', opacity: 0.7 }}>
                                                                    {t.subdomain}.garisphere.com
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Business Type */}
                                                    <td style={{ padding: '0.85rem 1.1rem', whiteSpace: 'nowrap' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 700,
                                                            color: btColor,
                                                            background: `${btColor}15`,
                                                            border: `1px solid ${btColor}30`,
                                                            padding: '0.2rem 0.55rem', borderRadius: '5px',
                                                        }}>
                                                            {btLabel}
                                                        </span>
                                                    </td>
                                                    {/* Plan */}
                                                    <td style={{ padding: '0.85rem 1.1rem' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                                                            color: planColor,
                                                            background: `${planColor}18`,
                                                            border: `1px solid ${planColor}30`,
                                                            padding: '0.2rem 0.55rem', borderRadius: '5px',
                                                        }}>
                                                            {t.plan || 'starter'}
                                                        </span>
                                                    </td>
                                                    {/* Users */}
                                                    <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)' }}>
                                                        {t.userCount}
                                                    </td>
                                                    {/* Status */}
                                                    <td style={{ padding: '0.85rem 1.1rem' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                                                            background: t.status === 'active' ? `${SUCCESS}18` : `${DANGER}12`,
                                                            color: t.status === 'active' ? '#34d399' : '#fca5a5',
                                                            border: `1px solid ${t.status === 'active' ? `${SUCCESS}30` : `${DANGER}25`}`,
                                                            padding: '0.2rem 0.5rem', borderRadius: '5px',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {t.status === 'active' ? '● Active' : '● Inactive'}
                                                        </span>
                                                    </td>
                                                    {/* Actions */}
                                                    <td style={{ padding: '0.85rem 1.1rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                            <button
                                                                onClick={() => window.open(`https://${t.subdomain}.garisphere.com`, '_blank')}
                                                                title="Open workspace"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                                    background: `${ACCENT}15`, border: `1px solid ${ACCENT}25`,
                                                                    color: '#a5b4fc', borderRadius: '6px',
                                                                    padding: '0.3rem 0.55rem', fontSize: '0.7rem',
                                                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}28`; e.currentTarget.style.color = 'white'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}15`; e.currentTarget.style.color = '#a5b4fc'; }}
                                                            >
                                                                Open <IconExternal />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/platform/tenants/${t.id}`)}
                                                                title="Edit workspace"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'rgba(255,255,255,0.55)', borderRadius: '6px',
                                                                    padding: '0.3rem 0.55rem', fontSize: '0.7rem',
                                                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                                                            >
                                                                Edit <IconEdit />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* System Health */}
                        <div style={{
                            background: CARD_BG, border: CARD_BORDER,
                            borderRadius: '16px', padding: '1.35rem 1.5rem',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: SUCCESS }}><IconShield /></span>
                                System Health
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <HealthBadge label="Database"  status={stats?.health?.database ?? 'checking…'} />
                                <HealthBadge label="API Layer" status={stats?.health?.api      ?? 'checking…'} />
                                <HealthBadge label="Uptime"    status={stats?.health?.uptime   ?? '—'} />
                            </div>
                        </div>

                        {/* Plan Breakdown */}
                        <div style={{
                            background: CARD_BG, border: CARD_BORDER,
                            borderRadius: '16px', padding: '1.35rem 1.5rem',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        }}>
                            <h2 style={{ margin: '0 0 1.1rem', fontSize: '1rem', fontWeight: 700 }}>Plan Breakdown</h2>
                            {[
                                { key: 'enterprise',   label: 'Enterprise',   color: WARNING },
                                { key: 'professional', label: 'Professional', color: ACCENT  },
                                { key: 'starter',      label: 'Starter',      color: SUCCESS },
                            ].map(p => {
                                const count = allTenants.filter((t: TenantData) => t.plan === p.key).length;
                                return (
                                    <PlanBar key={p.key} label={p.label} count={count} total={totalTenants || 1} color={p.color} />
                                );
                            })}
                        </div>

                        {/* Quick Actions */}
                        <div style={{
                            background: CARD_BG, border: CARD_BORDER,
                            borderRadius: '16px', padding: '1.35rem 1.5rem',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                {[
                                    { label: 'Manage Tenants',    path: '/platform/tenants',   emoji: '🏢' },
                                    { label: 'View Analytics',    path: '/platform/analytics', emoji: '📈' },
                                    { label: 'Open DMS Dashboard',path: '/',                   emoji: '↗' },
                                ].map(a => (
                                    <button
                                        key={a.path}
                                        onClick={() => router.push(a.path)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.65rem',
                                            width: '100%', padding: '0.7rem 0.9rem', borderRadius: '9px',
                                            background: `${ACCENT}08`, border: `1px solid ${ACCENT}14`,
                                            color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 600,
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}18`; e.currentTarget.style.color = 'white'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}08`; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                    >
                                        <span style={{ fontSize: '1rem' }}>{a.emoji}</span>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Platform Info */}
                        <div style={{
                            background: CARD_BG, border: CARD_BORDER,
                            borderRadius: '16px', padding: '1.35rem 1.5rem',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        }}>
                            <h2 style={{ margin: '0 0 0.85rem', fontSize: '1rem', fontWeight: 700 }}>Platform Info</h2>
                            {[
                                { label: 'Architecture',  val: 'SaaS Multi-Tenant'       },
                                { label: 'Isolation',     val: 'Subdomain + Row-Level'    },
                                { label: 'Auth Strategy', val: 'Admin Key + Cookie'       },
                                { label: 'DB Mode',       val: 'Multi-Tenant ✅'          },
                                { label: 'Version',       val: 'v2.0.0'                   },
                            ].map(r => (
                                <div key={r.label} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.42rem 0', borderBottom: '1px solid rgba(99,102,241,0.07)',
                                }}>
                                    <span style={{ fontSize: '0.74rem', color: MUTED }}>{r.label}</span>
                                    <span style={{ fontSize: '0.74rem', color: '#a5b4fc', fontWeight: 600 }}>{r.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
